---
title: 架构说明
description: Xdows Model 四种模式的关系、Pro Stacking 集成架构、Adaptive 分级路由流程和特征契约。
---

# 架构说明 {#Architecture}

本文详解 Xdows Model 的模式架构、特征契约和推理路径，便于集成方和贡献者理解内部工作方式。如果只需要使用模型，[快速开始](./get-started) 已足够。

## 模式关系 {#Modes}

```text
┌────────────────────────────────────────────────────────────┐
│                    Xdows Model 推理模式                     │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Standard   │     Flash    │     Pro      │   Adaptive    │
│  单 GBDT 模型 │  单 GBDT 模型 │ 4 分支集成   │  分级路由     │
│   299 维     │    68 维     │   519 维     │ Flash→Std→Pro │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

Standard、Flash、Pro 是三种独立的判定路径；Adaptive 不引入新模型，而是按风险等级逐级串联三者。

## Pro Stacking 集成 {#ProStacking}

Pro 模式不是单一模型，而是 **4 分支 Stacking 集成**，结构如下：

```text
PE 文件
   │
   ├──► Standard 分支 ──► p_std   ──┐
   ├──► Flash 分支    ──► p_flash ──┤
   ├──► RawStat 分支  ──► p_raw   ──┼──► Fusion（逻辑回归）──► 最终概率
   └──► Structural 分支 ──► p_struct ─┘
```

| 分支 | 维度 | 内容 |
| --- | --- | --- |
| Standard | 299 | 完整 PE/字节统计特征（与 Standard 模式共用契约） |
| Flash | 68 | 头尾区域特征（与 Flash 模式共用契约） |
| RawStat | 120 | 3 段 × 40 维的固定原始字节统计 |
| Structural | 32 | PE 结构特征 |
| **合计** | **519** | 送入四个分支的混合特征向量 |

四个分支各自输出一个 OOF（Out-of-Fold）概率，组成 4 维向量送入 **Fusion 模型**（逻辑回归），输出最终概率。

### 模型文件 {#ProFiles}

完整的 Pro 部署需要 5 个 ONNX 文件：

| 文件 | 维度 | 角色 |
| --- | --- | --- |
| `Xdows-Model-Pro.onnx` | 4 | Fusion 融合模型 |
| `Xdows-Model-Pro-Standard.onnx` | 299 | Standard 分支 |
| `Xdows-Model-Pro-Flash.onnx` | 68 | Flash 分支 |
| `Xdows-Model-Pro-RawStat.onnx` | 120 | RawStat 分支 |
| `Xdows-Model-Pro-Structural.onnx` | 32 | Structural 分支 |

Invoker 在加载 Pro 时会读取 Fusion 模型的输入维度：

- 若维度为 **4**，则启用 Stacking 集成路径，加载四个分支模型；
- 若维度为 **519**，则走单模型路径，直接把混合特征送入 Fusion 模型本身。

这一设计让 Pro 既能以集成形式获得最高准确率，也能在仅发布 519 维单模型时降级为单模型推理。

## Adaptive 分级路由 {#Adaptive}

Adaptive 模式按 **Flash → Standard → Pro** 的顺序逐级升级：

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

### 升级判定 {#AdaptivePolicy}

`AdaptiveDecisionPolicy.EvaluateIntermediate` 使用对称阈值：

- 当 `probability ≤ 100 − threshold` 时，判定为 **FinalSafe**，不再升级；
- 否则 **Escalate** 到下一级。

这意味着只有处于"中间灰区"的文件才会被升级，绝大多数安全文件在 Flash 阶段就完成判定。

### 资源开销 {#AdaptiveCost}

| 模式 | ONNX 会话数 | 单文件耗时 |
| --- | --- | --- |
| Flash | 1 | 最低 |
| Standard | 1 | 中等 |
| Pro（Stacking） | 5（1 Fusion + 4 分支） | 最高 |
| Pro（单模型） | 1 | 中等 |
| Adaptive（Stacking） | 7（1 Flash + 1 Standard + 1 Fusion + 4 分支） | 接近 Flash |
| Adaptive（单模型） | 3（1 Flash + 1 Standard + 1 Pro） | 接近 Flash |

Adaptive 常驻多个会话，但运行时绝大多数文件只走 Flash，因此平均耗时接近 Flash 模式。

## 特征契约 {#FeatureSchema}

所有特征维度由 `Xdows-Model-Config` 中的 `FeatureSchema` 静态常量类约束：

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

`Version = 2` 表示当前特征契约是第 2 版。修改任何 `FeatureCount` 常量都会让旧 ONNX 模型不兼容，必须同步重新训练所有受影响的模式。

### Pro 特征布局 {#ProLayout}

Pro 的 519 维混合特征向量布局如下：

| 偏移 | 长度 | 内容 |
| --- | --- | --- |
| 0 | 299 | Standard 特征 |
| 299 | 68 | Flash 特征 |
| 367 | 120 | RawStat 特征（3 段 × 40） |
| 487 | 32 | Structural 特征 |
| **487 + 32** | **519** | **总长度** |

四个分支从混合向量中按偏移切出自己的子向量，分别推理得到 OOF 概率，再交给 Fusion 模型。

## 推理流程 {#Inference}

无论哪种模式，单次推理都遵循以下步骤：

1. 检查目标文件是否存在；
2. 校验 PE 头（所有模式均通过 `FeatureExtractor.IsPeFile` 校验，不通过则抛 `NotSupportedException`）；
3. 按当前模式提取 `Features` 张量；
4. 调用 ONNX Runtime 读取 `Probability.output`；
5. 按 `TrainingConfig` 中的模式阈值输出安全或恶意判定。

Pro 模式在第 3 步会切出 4 个子向量分别推理，第 4 步对 Fusion 模型推理。Adaptive 模式会按路由流程多次执行步骤 3–5。

## 模型发现 {#ModelDiscovery}

默认模型发现顺序：

1. 运行目录（`AppContext.BaseDirectory`）
2. 程序集嵌入资源（`GetManifestResourceStream`）
3. 程序集所在目录

生产集成时应确保所有 `.onnx` 文件随应用一同发布，不要依赖嵌入资源或开发目录。
