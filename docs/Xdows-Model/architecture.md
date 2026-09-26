---
title: Architecture
description: The relationship among the four Xdows Model modes, the five-branch Pro Stacking ensemble, the Adaptive tiered-routing flow, the manifest-driven deployment contract, and the feature contracts.
---

# Architecture {#Architecture}

This document details the mode architecture, feature contracts, and inference paths of Xdows Model, helping integrators and contributors understand how it works internally. If you only need to use the models, [Get Started](./get-started) is sufficient.

## Mode Relationships {#Modes}

```text
┌────────────────────────────────────────────────────────────┐
│                    Xdows Model 推理模式                     │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Standard   │     Flash    │     Pro      │   Adaptive    │
│  单 GBDT 模型 │  单 GBDT 模型 │ 5 分支集成   │  分级路由     │
│   299 维     │    68 维     │   5143 维    │ Flash→Std→Pro │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

Standard, Flash, and Pro are three independent decision paths; Adaptive does not introduce a new model but chains the three in tiers by risk level.

## Pro Stacking Ensemble {#ProStacking}

Pro mode is not a single model but a **5-branch Stacking ensemble**, structured as follows:

```text
PE 文件
   │
   ├──► Standard 分支      ──► p_std    ──┐
   ├──► Flash 分支         ──► p_flash  ──┤
   ├──► RawStat 分支       ──► p_raw    ──┼──► Fusion（逻辑回归）──► 最终概率
   ├──► Structural 分支    ──► p_struct ──┤
   └──► ImportBehavior 分支 ──► p_import ──┘
```

| Branch | Dimension | Content |
| --- | --- | --- |
| Standard | 299 | Full PE/byte-statistics features (shares contract with Standard mode) |
| Flash | 68 | Head/tail region features (shares contract with Flash mode) |
| RawStat | 120 | 3 segments × 40 dimensions of fixed raw byte statistics |
| Structural | 32 | PE structure features |
| ImportBehavior | 4624 | Import-behavior hashing features (DLL hash 512 + API hash 4096 + 16 statistics) |
| **Total** | **5143** | Hybrid feature vector fed into the five branches |

Each of the five branches outputs an OOF (Out-of-Fold) probability, forming a 5-dimensional vector fed into the **Fusion model** (logistic regression), which outputs the final probability.

Because the feature layout is **append-only**, the ImportBehavior segment was added at the end of the vector and every earlier offset is unchanged. This is what lets an old four-branch model keep loading: the legacy layout is exactly the first 519 dimensions of the current 5143.

### ImportBehavior Features {#ImportBehavior}

The 4624-dimensional ImportBehavior segment is derived from the PE import table (including the delay-load import table) and is composed of three parts:

| Range | Length | Content |
| --- | --- | --- |
| `[0, 512)` | 512 | DLL-name hash buckets |
| `[512, 4608)` | 4096 | API-name hash buckets |
| `[4608, 4624)` | 16 | Import-table statistics |

- Hashing uses **FNV-1a 32-bit** with the seed `2166136261`; a name is mapped to a bucket and that bucket is set to `1.0` (an indicator bit, not a counter).
- DLL names are normalized with `Trim()` + `ToLowerInvariant()`; API names are only `Trim()`ed, because PE export/import names are case-sensitive. Ordinal imports use the synthetic key `dll!#<ordinal>`.
- The 16 statistics cover the parse status, import-directory presence and size, DLL/API counts, delay-load counts, ordinal and named API ratios, bucket occupancy, duplicate-DLL ratio, and delay-load presence.

The hash algorithm, seed, and both bucket dimensions are compile-time constants in `ImportHashConfig` and are duplicated in the model manifest; changing any of them requires bumping `FeatureSchema.Version` and retraining.

### Model Files {#ProFiles}

A complete Pro deployment requires 6 ONNX files plus one manifest:

| File | Purpose |
| --- | --- |
| `Xdows-Model-Pro.onnx` | Fusion model (logistic regression over the five branch probabilities) |
| `Xdows-Model-Pro-Standard.onnx` | Standard branch |
| `Xdows-Model-Pro-Flash.onnx` | Flash branch |
| `Xdows-Model-Pro-RawStat.onnx` | RawStat branch |
| `Xdows-Model-Pro-Structural.onnx` | Structural branch |
| `Xdows-Model-Pro-ImportBehavior.onnx` | ImportBehavior branch |
| `Xdows-Model-Pro.manifest.json` | Feature layout, branch table, hash configuration, and thresholds |

When loading Pro, the Invoker reads the Fusion model's input dimension:

- If the dimension is **5**, it enables the five-branch ensemble path, validates `Xdows-Model-Pro.manifest.json`, and loads the five branch models in the order the manifest declares;
- If the dimension is **4**, it takes the legacy four-branch path without a manifest and loads `-Standard`, `-Flash`, `-RawStat`, and `-Structural`;
- If the dimension is **5143** (or the legacy **519**), it takes the single-model path and feeds the hybrid features directly into the Fusion model itself.

A five-input Fusion model **without** a manifest is rejected outright rather than guessed at, so a partially deployed model set fails loudly instead of silently scoring with the wrong feature layout.

### Model Manifest {#Manifest}

`Xdows-Model-Pro.manifest.json` is generated by the trainer alongside the ONNX files and is validated by the Invoker on load. It records:

| Field | Meaning |
| --- | --- |
| `SchemaVersion` | Manifest schema version (currently `1`) |
| `ModelVersion` / `FeatureSchemaVersion` | Model version and the matching `FeatureSchema.Version` |
| `FeatureCount` / `FeatureHash` | Hybrid dimension (`5143`) and the FNV-1a 32-bit layout fingerprint |
| `FusionModelFileName` / `FusionInputCount` | Fusion file name and the expected branch count (`5`) |
| `Branches[]` | Per branch: `Name`, `FileName`, `InputDimension`, `FeatureOffset`, `FeatureCount` |
| `HashAlgorithm` / `HashSeed` / `DllHashDimensions` / `ApiHashDimensions` | Import-hash configuration that must match `ImportHashConfig` |
| `Threshold` / `RecommendedThreshold` | Fixed and recommended thresholds recorded with the model |

Both the fixed and recommended thresholds must be finite values in `0..100`. Validation covers the schema version, feature-schema version, layout fingerprint, hash configuration, fusion file name, fusion input count, hybrid dimension, every branch's dimension/offset, and the presence of every branch file. The layout fingerprint is computed by joining `schema={Version}` and one `|{branch}:{offset}:{count}` segment per branch plus the hash configuration, then hashing that string with FNV-1a 32-bit seeded by `HashSeed`.

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

This means only files in the "middle gray zone" are escalated; the vast majority of safe files are decided at the Flash stage. The Flash and Standard intermediate stages only use the fixed threshold and never produce a positive verdict — the three-tier verdict is applied once, at the final Pro stage.

### Resource Cost {#AdaptiveCost}

| Mode | ONNX sessions | Per-file time |
| --- | --- | --- |
| Flash | 1 | Lowest |
| Standard | 1 | Medium |
| Pro (5-branch Stacking) | 6 (1 Fusion + 5 branches) | Highest |
| Pro (legacy 4-branch Stacking) | 5 (1 Fusion + 4 branches) | Highest |
| Pro (single model) | 1 | Medium |
| Adaptive (Stacking) | 8 (1 Flash + 1 Standard + 1 Fusion + 5 branches) | Close to Flash |
| Adaptive (single model) | 3 (1 Flash + 1 Standard + 1 Pro) | Close to Flash |

Adaptive keeps multiple sessions resident, but at runtime the vast majority of files only go through Flash, so the average time is close to Flash mode.

## Feature Contracts {#FeatureSchema}

All feature dimensions are constrained by the `FeatureSchema` static constant class in `Xdows-Model-Config`:

```csharp
public static class FeatureSchema
{
    public const int Version = 3;
    public const int StandardFeatureCount = 299;
    public const int FlashFeatureCount = 68;
    public const int ProHybridFeatureCount = 5143;
    public const int ProRawStatCount = 120;
    public const int ProStructuralCount = 32;
    public const int ProImportBehaviorCount = 4624; // DllHash 512 + ApiHash 4096 + Stats 16
    public const int ProFusionFeatureCount = 5;
    public const int ProImportStatsCount = 16;

    public const int ProStandardOffset = 0;
    public const int ProFlashOffset = 299;         // ProStandardOffset + StandardFeatureCount
    public const int ProRawStatOffset = 367;       // ProFlashOffset + FlashFeatureCount
    public const int ProStructuralOffset = 487;    // ProRawStatOffset + ProRawStatCount
    public const int ProImportBehaviorOffset = 519; // ProStructuralOffset + ProStructuralCount

    // Legacy (Schema v2) layout, kept so old four-branch models still load.
    public const int ProLegacyHybridFeatureCount = 519;
    public const int ProLegacyFusionFeatureCount = 4;
}
```

`Version = 3` indicates the current feature contract is version 3. Modifying any `FeatureCount` constant will break compatibility with old ONNX models and requires synchronously retraining all affected modes.

### Pro Feature Layout {#ProLayout}

The layout of Pro's 5143-dimensional hybrid feature vector is as follows:

| Offset | Length | Content |
| --- | --- | --- |
| 0 | 299 | Standard features |
| 299 | 68 | Flash features |
| 367 | 120 | RawStat features (3 segments × 40) |
| 487 | 32 | Structural features |
| 519 | 4624 | ImportBehavior features (512 DLL hash + 4096 API hash + 16 statistics) |
| **519 + 4624** | **5143** | **Total length** |

The five branches slice their own sub-vectors from the hybrid vector by offset, run inference separately to obtain OOF probabilities, and then hand them to the Fusion model. The branch order in the hybrid vector is exactly the branch order in the Fusion input.

## Inference Flow {#Inference}

Regardless of the mode, a single inference follows these steps:

1. Check whether the target file exists;
2. Validate the PE header (all modes validate via `FeatureExtractor.IsPeFile`; if validation fails, a `NotSupportedException` is thrown);
3. Extract the `Features` tensor according to the current mode;
4. Call ONNX Runtime and read `Probability.output`;
5. Apply the mode threshold from `TrainingConfig` and output a clean or malicious decision.

Pro mode slices 5 sub-vectors at step 3 for separate inference and runs the Fusion model at step 4. Adaptive mode executes steps 3–5 multiple times according to the routing flow.

## Three-Tier Verdict {#Verdict}

All three implementations — the managed Invoker, the native runtime, and the Rust invoker — share one three-tier verdict, exposed through a stable integer value:

| Verdict | ABI value | Condition |
| --- | --- | --- |
| `Clean` | 0 | `probability` below the recommended threshold |
| `Suspicious` | 1 | `probability` at or above the recommended threshold and below the fixed threshold |
| `Malware` | 2 | `probability` at or above the fixed threshold |

The fixed threshold always takes precedence. The recommended threshold is read from `<model>.threshold.json` next to the model and never overrides the fixed threshold — it only defines the lower bound of the `Suspicious` band.

For compatibility with callers that only look at the boolean `IsThreat`, the native runtime reports `IsThreat = 1` for `Suspicious` as well; the detection name is still produced only for `Malware`.

## Model Discovery {#ModelDiscovery}

Models are no longer embedded in the assembly. The Invoker resolves a model file in this order:

1. The `Models` subdirectory next to the assembly (`ModelLayout.ModelDirectoryName`);
2. The assembly directory itself, for deployments created before the `Models` layout existed.

If neither location contains the file, loading fails with an error naming both candidate paths. In production integrations, publish the whole `Models` directory together with the app; do not rely on the legacy assembly-directory fallback.
