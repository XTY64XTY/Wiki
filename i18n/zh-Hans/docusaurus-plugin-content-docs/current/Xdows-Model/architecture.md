---
title: 架构说明
description: Xdows Model 四种模式的关系、5 分支 Pro Stacking 集成、Adaptive 分级路由流程、manifest 驱动的部署契约和特征契约。
---

# 架构说明 {#Architecture}

本文详解 Xdows Model 的模式架构、特征契约和推理路径，便于集成方和贡献者理解内部工作方式。如果只需要使用模型，[快速开始](./get-started) 已足够。

## 模式关系 {#Modes}

```text
┌────────────────────────────────────────────────────────────┐
│                    Xdows Model 推理模式                     │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Standard   │     Flash    │     Pro      │   Adaptive    │
│  单 GBDT 模型 │  单 GBDT 模型 │ 5 分支集成   │  分级路由     │
│   299 维     │    68 维     │   5143 维    │ Flash→Std→Pro │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

Standard、Flash、Pro 是三种独立的判定路径；Adaptive 不引入新模型，而是按风险等级逐级串联三者。

## Pro Stacking 集成 {#ProStacking}

Pro 模式不是单一模型，而是 **5 分支 Stacking 集成**，结构如下：

```text
PE 文件
   │
   ├──► Standard 分支      ──► p_std    ──┐
   ├──► Flash 分支         ──► p_flash  ──┤
   ├──► RawStat 分支       ──► p_raw    ──┼──► Fusion（逻辑回归）──► 最终概率
   ├──► Structural 分支    ──► p_struct ──┤
   └──► ImportBehavior 分支 ──► p_import ──┘
```

| 分支 | 维度 | 内容 |
| --- | --- | --- |
| Standard | 299 | 完整 PE/字节统计特征（与 Standard 模式共用契约） |
| Flash | 68 | 头尾区域特征（与 Flash 模式共用契约） |
| RawStat | 120 | 3 段 × 40 维的固定原始字节统计 |
| Structural | 32 | PE 结构特征 |
| ImportBehavior | 4624 | 导入行为哈希特征（DLL 哈希 512 + API 哈希 4096 + 统计 16） |
| **合计** | **5143** | 送入五个分支的混合特征向量 |

五个分支各自输出一个 OOF（Out-of-Fold）概率，组成 5 维向量送入 **Fusion 模型**（逻辑回归），输出最终概率。

由于特征布局是**只增不改（append-only）**的，ImportBehavior 段被追加到向量末尾，此前所有偏移保持不变。这正是旧版 4 分支模型仍能加载的原因：旧版布局恰好等于当前 5143 维的前 519 维。

### ImportBehavior 特征 {#ImportBehavior}

4624 维的 ImportBehavior 段取自 PE 导入表（含延迟加载导入表），由三部分组成：

| 区间 | 长度 | 内容 |
| --- | --- | --- |
| `[0, 512)` | 512 | DLL 名哈希桶 |
| `[512, 4608)` | 4096 | API 名哈希桶 |
| `[4608, 4624)` | 16 | 导入表统计 |

- 哈希使用 **FNV-1a 32 位**，种子为 `2166136261`；名称被映射到一个桶，并将该桶置为 `1.0`（指示位，不是计数器）。
- DLL 名用 `Trim()` + `ToLowerInvariant()` 归一化；API 名只做 `Trim()`，因为 PE 导出/导入名区分大小写。按序号导入使用合成键 `dll!#<ordinal>`。
- 这 16 项统计覆盖解析状态、导入目录是否存在及大小、DLL/API 数量、延迟加载数量、序号与具名 API 比例、桶占用、重复 DLL 比例，以及是否存在延迟加载。

哈希算法、种子和两个桶维度都是 `ImportHashConfig` 中的编译期常量，并在模型 manifest 中重复记录；修改其中任何一项都需要提升 `FeatureSchema.Version` 并重新训练。

### 模型文件 {#ProFiles}

完整的 Pro 部署需要 6 个 ONNX 文件外加一个 manifest：

| 文件 | 作用 |
| --- | --- |
| `Xdows-Model-Pro.onnx` | Fusion 融合模型 |
| `Xdows-Model-Pro-Standard.onnx` | Standard 分支 |
| `Xdows-Model-Pro-Flash.onnx` | Flash 分支 |
| `Xdows-Model-Pro-RawStat.onnx` | RawStat 分支 |
| `Xdows-Model-Pro-Structural.onnx` | Structural 分支 |
| `Xdows-Model-Pro-ImportBehavior.onnx` | ImportBehavior 分支 |
| `Xdows-Model-Pro.manifest.json` | 特征布局、分支表、哈希配置和阈值 |

Invoker 在加载 Pro 时会读取 Fusion 模型的输入维度：

- 若维度为 **5**，则启用 5 分支集成路径，校验 `Xdows-Model-Pro.manifest.json`，并按 manifest 声明的顺序加载五个分支模型；
- 若维度为 **4**，则走无需 manifest 的旧版 4 分支路径，加载 `-Standard`、`-Flash`、`-RawStat`、`-Structural`；
- 若维度为 **5143**（或旧版 **519**），则走单模型路径，直接把混合特征送入 Fusion 模型本身。

**没有** manifest 的 5 输入 Fusion 模型会被直接拒绝，而不是靠猜测处理，因此部署不完整的模型集会明确报错，而不会静默地用错误的特征布局打分。

### 模型 Manifest {#Manifest}

`Xdows-Model-Pro.manifest.json` 由训练器与 ONNX 文件一同生成，并在加载时由 Invoker 校验。它记录：

| 字段 | 含义 |
| --- | --- |
| `SchemaVersion` | manifest schema 版本（当前为 `1`） |
| `ModelVersion` / `FeatureSchemaVersion` | 模型版本及与之匹配的 `FeatureSchema.Version` |
| `FeatureCount` / `FeatureHash` | 混合维度（`5143`）和 FNV-1a 32 位布局指纹 |
| `FusionModelFileName` / `FusionInputCount` | Fusion 文件名和期望的分支数（`5`） |
| `Branches[]` | 每个分支：`Name`、`FileName`、`InputDimension`、`FeatureOffset`、`FeatureCount` |
| `HashAlgorithm` / `HashSeed` / `DllHashDimensions` / `ApiHashDimensions` | 必须与 `ImportHashConfig` 一致的导入哈希配置 |
| `Threshold` / `RecommendedThreshold` | 随模型记录的固定阈值和推荐阈值 |

固定阈值和推荐阈值都必须是 `0..100` 内的有限值。校验范围包括 schema 版本、特征 schema 版本、布局指纹、哈希配置、Fusion 文件名、Fusion 输入数量、混合维度、每个分支的维度/偏移，以及每个分支文件是否存在。布局指纹的计算方式为：拼接 `schema={Version}` 以及每个分支的 `|{branch}:{offset}:{count}` 段，再加上哈希配置，然后用 `HashSeed` 作为种子的 FNV-1a 32 位对该字符串求哈希。

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

这意味着只有处于"中间灰区"的文件才会被升级，绝大多数安全文件在 Flash 阶段就完成判定。Flash 和 Standard 这两个中间阶段只使用固定阈值，绝不产生阳性判定——三档判定只在最后的 Pro 阶段应用一次。

### 资源开销 {#AdaptiveCost}

| 模式 | ONNX 会话数 | 单文件耗时 |
| --- | --- | --- |
| Flash | 1 | 最低 |
| Standard | 1 | 中等 |
| Pro（5 分支 Stacking） | 6（1 Fusion + 5 分支） | 最高 |
| Pro（旧版 4 分支 Stacking） | 5（1 Fusion + 4 分支） | 最高 |
| Pro（单模型） | 1 | 中等 |
| Adaptive（Stacking） | 8（1 Flash + 1 Standard + 1 Fusion + 5 分支） | 接近 Flash |
| Adaptive（单模型） | 3（1 Flash + 1 Standard + 1 Pro） | 接近 Flash |

Adaptive 常驻多个会话，但运行时绝大多数文件只走 Flash，因此平均耗时接近 Flash 模式。

## 特征契约 {#FeatureSchema}

所有特征维度由 `Xdows-Model-Config` 中的 `FeatureSchema` 静态常量类约束：

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

`Version = 3` 表示当前特征契约是第 3 版。修改任何 `FeatureCount` 常量都会让旧 ONNX 模型不兼容，必须同步重新训练所有受影响的模式。

### Pro 特征布局 {#ProLayout}

Pro 的 5143 维混合特征向量布局如下：

| 偏移 | 长度 | 内容 |
| --- | --- | --- |
| 0 | 299 | Standard 特征 |
| 299 | 68 | Flash 特征 |
| 367 | 120 | RawStat 特征（3 段 × 40） |
| 487 | 32 | Structural 特征 |
| 519 | 4624 | ImportBehavior 特征（512 DLL 哈希 + 4096 API 哈希 + 统计 16） |
| **519 + 4624** | **5143** | **总长度** |

五个分支从混合向量中按偏移切出自己的子向量，分别推理得到 OOF 概率，再交给 Fusion 模型。混合向量中的分支顺序与 Fusion 输入的分支顺序完全一致。

## 推理流程 {#Inference}

无论哪种模式，单次推理都遵循以下步骤：

1. 检查目标文件是否存在；
2. 校验 PE 头（所有模式均通过 `FeatureExtractor.IsPeFile` 校验，不通过则抛 `NotSupportedException`）；
3. 按当前模式提取 `Features` 张量；
4. 调用 ONNX Runtime 读取 `Probability.output`；
5. 按 `TrainingConfig` 中的模式阈值输出安全或恶意判定。

Pro 模式在第 3 步会切出 5 个子向量分别推理，第 4 步对 Fusion 模型推理。Adaptive 模式会按路由流程多次执行步骤 3–5。

## 三档判定 {#Verdict}

托管 Invoker、原生运行时和 Rust 调用器三种实现共用同一套三档判定，通过稳定的整数值对外暴露：

| 判定 | ABI 值 | 条件 |
| --- | --- | --- |
| `Clean` | 0 | `probability` 低于推荐阈值 |
| `Suspicious` | 1 | `probability` 达到或高于推荐阈值且低于固定阈值 |
| `Malware` | 2 | `probability` 达到或高于固定阈值 |

固定阈值始终优先。推荐阈值从模型同级的 `<model>.threshold.json` 读取，且不会覆盖固定阈值——它只定义 `Suspicious` 区间的下界。

为了兼容只看布尔值 `IsThreat` 的调用方，原生运行时对 `Suspicious` 也会报告 `IsThreat = 1`；检测名仍然只在 `Malware` 时生成。

## 模型发现 {#ModelDiscovery}

模型已不再内嵌进程序集。Invoker 按以下顺序解析模型文件：

1. 程序集同级的 `Models` 子目录（`ModelLayout.ModelDirectoryName`）；
2. 程序集目录本身，仅用于早于 `Models` 布局的旧部署。

如果两个位置都没有该文件，加载会失败并报出这两个候选路径。生产集成时应把整个 `Models` 目录随应用一同发布，不要依赖旧版的程序集目录回退。
