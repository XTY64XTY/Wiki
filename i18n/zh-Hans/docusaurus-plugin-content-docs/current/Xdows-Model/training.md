---
title: 训练与评估
description: Xdows Model 的训练工具、样本规范、数据集划分、超参数配置、推荐阈值校准和批量评估流程。
---

# 训练与评估 {#Training}

本文介绍如何使用 `Xdows-Model-Maker` 训练模型，以及如何用 `Xdows-Model-Evaluator` 做批量评估。模型架构和特征契约见 [架构说明](./architecture)。

## 样本规范 {#Samples}

默认样本目录来自 `TrainingConfig`：

- 黑样本（恶意）：`D:\Code\Model\Files\Black`
- 白样本（安全）：`D:\Code\Model\Files\White`

两个目录下的文件均应为 PE 文件（`.exe`、`.dll` 等）。样本文件名不强制要求特定格式，但建议按家族或来源分类存放以便回溯。

Pro 训练时，每个样本还可以附带三个可选元数据字段，以保证评估结果真实可靠：

| 字段 | 用途 |
| --- | --- |
| `GroupKey` | 恶意软件家族或活动标识。共享同一 `GroupKey` 的样本会保留在划分的同一侧，避免近似重复样本从测试集泄漏到训练集。 |
| `TimeKey` | 样本采集时间。当 `ProSplitMode` 为 `TimeOrdered` 时必填。 |
| `ContentHash` | 文件内容的 SHA-256，由划分器计算用于去重。 |

:::caution[安全提示]
不要提交真实恶意样本到仓库。`Xdows-Model\tests\samples\README.md` 描述了安全样本的存放与使用规范。训练用的黑样本应放在仓库外部，并通过 `.gitignore` 排除。
:::

## 训练工具 {#Maker}

`Xdows-Model-Maker` 是交互式菜单工具：

```powershell
dotnet run --project D:\Code\Xdows-Model\Xdows-Model-Maker
```

菜单提供模式复选框以及以下操作：

- 开始训练（依次训练所有勾选的模式）
- 开始样本清洗与统计
- **复制产物到 Invoker** — 把刚训练好的 ONNX 文件、Pro manifest 和推荐阈值 manifest 复制到 `Xdows-Model-Invoker\Models\`，Invoker 无需手动复制即可加载
- 退出

Pro 训练会依次训练五个分支模型（Standard / Flash / RawStat / Structural / ImportBehavior），再用它们的 Out-of-Fold 概率训练 Fusion 逻辑回归模型，最终输出 6 个 ONNX 文件以及 `Xdows-Model-Pro.manifest.json`。产物清单由 `ProBranches` 和 `ProModelManifest` 推导而来，而非写死，因此新增的分支不会被静默遗漏在复制步骤之外。

### 数据集划分 {#Splitter}

Pro 使用 `ProDatasetSplitter`，而不是简单的随机划分：

1. **内容哈希去重**（`ProDeduplicateByContentHash`，默认开启）先移除字节完全相同的样本。否则重复样本会同时落入训练集和测试集，虚高报告的指标。
2. **分组隔离**（`ProEnforceGroupIsolation`，默认开启）让共享同一 `GroupKey` 的样本全部落在同一侧。没有 `GroupKey` 的样本会退化为每个样本一组，划分报告会明确说明分组隔离未生效。
3. **划分策略**（`ProSplitMode`）：`StratifiedRandom`（默认）在两半中保持类别比例；`TimeOrdered` 按 `TimeKey` 排序，把最新的一段放入测试集，且当样本缺少 `TimeKey` 时明确报错，而不是静默降级。
4. **报告**：划分器会打印两半的类别分布以及去重和隔离统计。

外层测试集比例为 `ProTestFraction`（默认 `0.2`），必须严格介于 0 和 1 之间。

## 超参数 {#Hyperparameters}

关键超参数定义在 `TrainingConfig.cs` 中，可在训练前修改：

### 通用 {#HyperCommon}

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `RandomSeed` | 43846 | 全局随机种子，保证可复现 |
| `FalsePositiveCostRatio` | 2.65 | 一个误报等价于多少个漏报；同时驱动阈值选择和样本加权 |
| `UseCostSensitiveThreshold` | `true` | 自动校准推荐阈值，而不是使用固定阈值 |
| `UseCostSensitiveTrainingWeight` | `true` | 将误报代价传递到 LightGBM 正类权重中 |

### Standard {#HyperStandard}

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `LearningRate` | 0.025 | 学习率 |
| `NumberOfLeaves` | 127 | 叶子数 |
| `MinimumExampleCountPerLeaf` | 16 | 叶节点最小样本数 |
| `NumberOfIterations` | 1400 | 迭代次数 |
| `StandardL1Regularization` | 0.02 | L1 正则化 |
| `StandardL2Regularization` | 0.4 | L2 正则化 |
| `StandardMaximumTreeDepth` | 10 | 最大树深度 |
| `StandardFeatureFraction` | 0.9 | 特征采样比例 |
| `StandardSubsampleFraction` | 0.85 | 样本采样比例 |
| `StandardTargetFalsePositiveRate` | 0.005 | 阈值校准目标 FPR |
| `StandardThreshold` | 92.0 | 固定判毒阈值（百分比） |

### Flash {#HyperFlash}

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `FlashLearningRate` | 0.1 | 学习率 |
| `FlashNumberOfLeaves` | 31 | 叶子数 |
| `FlashMinimumExampleCountPerLeaf` | 8 | 叶节点最小样本数 |
| `FlashNumberOfIterations` | 800 | 迭代次数 |
| `FlashL1Regularization` | 0.01 | L1 正则化 |
| `FlashL2Regularization` | 0.2 | L2 正则化 |
| `FlashMaximumTreeDepth` | 5 | 最大树深度 |
| `FlashThreshold` | 96.0 | 固定判毒阈值（百分比） |

### Pro {#HyperPro}

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `ProLearningRate` | 0.01 | 分支学习率 |
| `ProNumberOfLeaves` | 63 | 叶子数 |
| `ProMinimumExampleCountPerLeaf` | 10 | 叶节点最小样本数 |
| `ProNumberOfIterations` | 1200 | 分支迭代次数 |
| `ProL1Regularization` | 0.01 | L1 正则化 |
| `ProL2Regularization` | 0.1 | L2 正则化 |
| `ProMaximumTreeDepth` | 8 | 最大树深度 |
| `ProFeatureFraction` | 0.85 | 特征采样比例 |
| `ProSubsampleFraction` | 0.8 | 样本采样比例 |
| `ProMaxParallelBranches` | 4 | 分支并行度上限 |
| `ProTestFraction` | 0.2 | 外层测试集比例 |
| `ProSplitMode` | `StratifiedRandom` | `StratifiedRandom` 或 `TimeOrdered` |
| `ProThreshold` | 94.0 | 固定判毒阈值（百分比） |

Pro 的 Fusion 模型使用逻辑回归，没有独立的 GBDT 超参数。

## 推荐阈值校准 {#RecommendedThreshold}

每种模式都会随 ONNX 文件一同发布一个推荐阈值：

- Standard → `Xdows-Model.threshold.json`
- Flash → `Xdows-Model-Flash.threshold.json`
- Pro → `Xdows-Model-Pro.threshold.json`，并同步记录到 `Xdows-Model-Pro.manifest.json`

该值在训练时以代价敏感目标选出（一个误报按 `FalsePositiveCostRatio` 个漏报计），并随选择方法一同记录。它定义 `Suspicious` 区间的下界，且不会覆盖 `TrainingConfig` 中的固定阈值。只有在 `UseCostSensitiveThreshold` 开启时，manifest 才会写入 ML.NET 模型和导出的 ONNX 文件旁边。

## 模型输出 {#Output}

训练完成后，模型文件会输出到 `TrainingConfig` 指定的路径：

| 模式 | 输出文件 |
| --- | --- |
| Standard | `Xdows-Model.zip` + `Xdows-Model.onnx` + `Xdows-Model.threshold.json` |
| Flash | `Xdows-Model-Flash.zip` + `Xdows-Model-Flash.onnx` + `Xdows-Model-Flash.threshold.json` |
| Pro | `Xdows-Model-Pro.zip` + `Xdows-Model-Pro.onnx` + 5 个分支 `.onnx`（`-Standard`、`-Flash`、`-RawStat`、`-Structural`、`-ImportBehavior`）+ `Xdows-Model-Pro.manifest.json` + `Xdows-Model-Pro.threshold.json` |

Pro 默认输出 5 输入 Fusion 模型加 5 个分支模型，Invoker 在校验 manifest 后启用 5 分支 Stacking 路径。旧版 4 分支模型（4 输入 Fusion、519 维混合输入、无 manifest）仍可通过兼容路径加载；不含分支的 5143 维单模型则走单模型降级路径。

使用 Maker 菜单中的**复制产物到 Invoker**把整套文件放入 `Xdows-Model-Invoker\Models\`。Pro 模型、它的五个分支模型和 manifest 必须一起部署——没有 manifest 的 5 输入 Fusion 模型会被 Invoker 拒绝。

## 批量评估 {#Evaluator}

`Xdows-Model-Evaluator` 对指定模式的模型在样本集上做批量评估，输出准确率、TPR、FPR 和平均扫描耗时，可选导出误判样本 CSV。

```powershell
dotnet run --project D:\Code\Xdows-Model\Xdows-Model-Evaluator -- --mode all --limit 700 --csv hard-cases.csv
```

### 参数 {#EvaluatorOptions}

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `--mode <all\|standard\|flash\|pro>` | 评估模式 | `all` |
| `--black <folder>` | 黑样本目录 | `TrainingConfig.BlackFolder` |
| `--white <folder>` | 白样本目录 | `TrainingConfig.WhiteFolder` |
| `--limit <n>` | 每类抽样数量 | 全量 |
| `--seed <n>` | 抽样种子 | 42 |
| `--csv <path>` | 只导出 FP/FN/失败样本 | 不导出 |
| `--standard-model <path>` | Standard ONNX 路径 | 默认路径 |
| `--flash-model <path>` | Flash ONNX 路径 | 默认路径 |
| `--pro-model <path>` | Pro ONNX 路径 | 默认路径 |

### 输出指标 {#Metrics}

每个模式会输出以下指标：

- **Accuracy**：准确率 = (TP + TN) / 总数
- **TPR**：真正例率（召回率）= TP / (TP + FN)
- **FPR**：假正例率（误报率）= FP / (FP + TN)
- **F1**：F1 分数 = 2 × TP / (2 × TP + FP + FN)
- **AUC**：ROC 曲线下面积（条件输出）
- **AUPRC**：PR 曲线下面积（条件输出）
- **平均扫描耗时**：单文件平均推理时间
- **失败数**：因 PE 校验失败、文件读取错误等无法评估的样本数

CSV 导出包含 `mode,path,label,prediction,probability,error` 字段，只记录 FP、FN 和失败样本，用于排查 hard case。

## 原生一致性测试 {#NativeConsistency}

`tests\Invoke-NativeConsistency.ps1` 会用同一批安全 PE 样本，分别通过托管调用器和原生 DLL 对 Standard、Flash、Pro 和 Adaptive 执行扫描：

```powershell
& 'D:\Code\Xdows-Model\tests\Invoke-NativeConsistency.ps1' -SkipBuild
```

两端必须在三档判定（`Clean` / `Suspicious` / `Malware`）和威胁判定上一致，且概率差必须在配置的容差内。由于判定依赖推荐阈值，脚本还会断言所需的模型文件齐全——五个 Pro 分支模型、`Xdows-Model-Pro.manifest.json`，以及三个 `*.threshold.json` manifest。

修改 Invoker 或 Native 任一侧的特征提取或推理逻辑后，都必须跑一遍此测试，确保两端结论一致。
