---
title: Architecture
description: The relationship among the four Xdows Model modes, the Pro Stacking ensemble architecture, the Adaptive tiered-routing flow, and the feature contracts.
---

# Architecture {#Architecture}

This document details the mode architecture, feature contracts, and inference paths of Xdows Model, helping integrators and contributors understand how it works internally. If you only need to use the models, [Get Started](./get-started) is sufficient.

## Mode Relationships {#Modes}

```text
┌────────────────────────────────────────────────────────────┐
│                    Xdows Model 推理模式                     │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Standard   │     Flash    │     Pro      │   Adaptive    │
│  单 GBDT 模型 │  单 GBDT 模型 │ 4 分支集成   │  分级路由     │
│   299 维     │    68 维     │   519 维     │ Flash→Std→Pro │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

Standard, Flash, and Pro are three independent decision paths; Adaptive does not introduce a new model but chains the three in tiers by risk level.

## Pro Stacking Ensemble {#ProStacking}

Pro mode is not a single model but a **4-branch Stacking ensemble**, structured as follows:

```text
PE 文件
   │
   ├──► Standard 分支 ──► p_std   ──┐
   ├──► Flash 分支    ──► p_flash ──┤
   ├──► RawStat 分支  ──► p_raw   ──┼──► Fusion（逻辑回归）──► 最终概率
   └──► Structural 分支 ──► p_struct ─┘
```

| Branch | Dimension | Content |
| --- | --- | --- |
| Standard | 299 | Full PE/byte-statistics features (shares contract with Standard mode) |
| Flash | 68 | Head/tail region features (shares contract with Flash mode) |
| RawStat | 120 | 3 segments × 40 dimensions of fixed raw byte statistics |
| Structural | 32 | PE structure features |
| **Total** | **519** | Hybrid feature vector fed into the four branches |

Each of the four branches outputs an OOF (Out-of-Fold) probability, forming a 4-dimensional vector fed into the **Fusion model** (logistic regression), which outputs the final probability.

### Model Files {#ProFiles}

A complete Pro deployment requires 5 ONNX files:

| File | Dimension | Role |
| --- | --- | --- |
| `Xdows-Model-Pro.onnx` | 4 | Fusion fusion model |
| `Xdows-Model-Pro-Standard.onnx` | 299 | Standard branch |
| `Xdows-Model-Pro-Flash.onnx` | 68 | Flash branch |
| `Xdows-Model-Pro-RawStat.onnx` | 120 | RawStat branch |
| `Xdows-Model-Pro-Structural.onnx` | 32 | Structural branch |

When loading Pro, the Invoker reads the Fusion model's input dimension:

- If the dimension is **4**, it enables the Stacking ensemble path and loads the four branch models;
- If the dimension is **519**, it takes the single-model path and feeds the hybrid features directly into the Fusion model itself.

This design lets Pro achieve the highest accuracy in ensemble form, while also degrading to single-model inference when only a 519-dimensional single model is published.

## Adaptive Tiered Routing {#Adaptive}

Adaptive mode escalates tier by tier in the order **Flash → Standard → Pro**:

```text
PE 文件
   │
   ▼
 Flash 判定 ──► p ≤ 100 − FlashThreshold ?  ── 是 ──► 放行（Flash 结论）
                │
                否
                ▼
 Standard 判定 ──► p ≤ 100 − StandardThreshold ? ── 是 ──► 放行（Standard 结论）
                │
                否
                ▼
 Pro 判定 ──► p ≥ ProThreshold ?  ── 是 ──► 判毒（Pro 结论）
                                   否 ──► 放行（Pro 结论）
```

### Escalation Decision {#AdaptivePolicy}

`AdaptiveDecisionPolicy.EvaluateIntermediate` uses a symmetric threshold:

- When `probability ≤ 100 − threshold`, it decides **FinalSafe** and does not escalate further;
- Otherwise it **Escalates** to the next tier.

This means only files in the "middle gray zone" are escalated; the vast majority of safe files are decided at the Flash stage.

### Resource Cost {#AdaptiveCost}

| Mode | ONNX sessions | Per-file time |
| --- | --- | --- |
| Flash | 1 | Lowest |
| Standard | 1 | Medium |
| Pro (Stacking) | 5 (1 Fusion + 4 branches) | Highest |
| Pro (single model) | 1 | Medium |
| Adaptive (Stacking) | 7 (1 Flash + 1 Standard + 1 Fusion + 4 branches) | Close to Flash |
| Adaptive (single model) | 3 (1 Flash + 1 Standard + 1 Pro) | Close to Flash |

Adaptive keeps multiple sessions resident, but at runtime the vast majority of files only go through Flash, so the average time is close to Flash mode.

## Feature Contracts {#FeatureSchema}

All feature dimensions are constrained by the `FeatureSchema` static constant class in `Xdows-Model-Config`:

```csharp
public static class FeatureSchema
{
    public const int Version = 2;
    public const int StandardFeatureCount = 299;
    public const int FlashFeatureCount = 68;
    public const int ProHybridFeatureCount = 519;
    public const int ProRawStatCount = 120;
    public const int ProStructuralCount = 32;
    public const int ProFusionFeatureCount = 4;

    public const int ProStandardOffset = 0;
    public const int ProFlashOffset = 299;      // ProStandardOffset + StandardFeatureCount
    public const int ProRawStatOffset = 367;    // ProFlashOffset + FlashFeatureCount
    public const int ProStructuralOffset = 487; // ProRawStatOffset + ProRawStatCount
}
```

`Version = 2` indicates the current feature contract is version 2. Modifying any `FeatureCount` constant will break compatibility with old ONNX models and requires synchronously retraining all affected modes.

### Pro Feature Layout {#ProLayout}

The layout of Pro's 519-dimensional hybrid feature vector is as follows:

| Offset | Length | Content |
| --- | --- | --- |
| 0 | 299 | Standard features |
| 299 | 68 | Flash features |
| 367 | 120 | RawStat features (3 segments × 40) |
| 487 | 32 | Structural features |
| **487 + 32** | **519** | **Total length** |

The four branches slice their own sub-vectors from the hybrid vector by offset, run inference separately to obtain OOF probabilities, and then hand them to the Fusion model.

## Inference Flow {#Inference}

Regardless of the mode, a single inference follows these steps:

1. Check whether the target file exists;
2. Validate the PE header (all modes validate via `FeatureExtractor.IsPeFile`; if validation fails, a `NotSupportedException` is thrown);
3. Extract the `Features` tensor according to the current mode;
4. Call ONNX Runtime and read `Probability.output`;
5. Apply the mode threshold from `TrainingConfig` and output a safe or malicious decision.

Pro mode slices 4 sub-vectors at step 3 for separate inference and runs the Fusion model at step 4. Adaptive mode executes steps 3–5 multiple times according to the routing flow.

## Model Discovery {#ModelDiscovery}

Default model discovery order:

1. Runtime directory (`AppContext.BaseDirectory`)
2. Assembly embedded resources (`GetManifestResourceStream`)
3. Assembly directory

In production integrations, ensure all `.onnx` files are published together with the app; do not rely on embedded resources or development directories.
