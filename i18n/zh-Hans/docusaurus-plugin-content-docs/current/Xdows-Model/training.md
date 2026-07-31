---
title: 训练与评估
description: Xdows Model 的训练工具、样本规范、超参数配置和批量评估流程。
---

# 训练与评估 {#Training}

本文介绍如何使用 `Xdows-Model-Maker` 训练模型，以及如何用 `Xdows-Model-Evaluator` 做批量评估。模型架构和特征契约见 [架构说明](./architecture)。

## 样本规范 {#Samples}

默认样本目录来自 `TrainingConfig`：

- 黑样本（恶意）：`D:\Code\Model\Files\Black`
- 白样本（安全）：`D:\Code\Model\Files\White`

两个目录下的文件均应为 PE 文件（`.exe`、`.dll` 等）。样本文件名不强制要求特定格式，但建议按家族或来源分类存放以便回溯。

:::caution[安全提示]
不要提交真实恶意样本到仓库。`Xdows-Model\tests\samples\README.md` 描述了安全样本的存放与使用规范。训练用的黑样本应放在仓库外部，并通过 `.gitignore` 排除。
:::

## 训练工具 {#Maker}

`Xdows-Model-Maker` 是交互式命令行训练工具，启动后会显示菜单：

```powershell
dotnet run --project D:\Code\Xdows-Model\Xdows-Model-Maker
```

菜单支持以下操作：

- 训练 Standard 模型
- 训练 Flash 模型
- 训练 Pro 模型（含 4 分支 Stacking）
- 同时训练多个模式
- 样本清洗与统计

Pro 训练会依次训练四个分支模型（Standard / Flash / RawStat / Structural），再用 Out-of-Fold 概率训练 Fusion 逻辑回归模型，最终输出 5 个 ONNX 文件。

## 超参数 {#Hyperparameters}

关键超参数定义在 `TrainingConfig.cs` 中，可在训练前修改：

### 通用 {#HyperCommon}

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `RandomSeed` | 43846 | 全局随机种子，保证可复现 |

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
| `StandardThreshold` | 92.0 | 判毒阈值（百分比） |

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
| `FlashThreshold` | 96.0 | 判毒阈值（百分比） |

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
| `ProThreshold` | 94.0 | 判毒阈值（百分比） |

Pro 的 Fusion 模型使用逻辑回归，没有独立的 GBDT 超参数。

## 模型输出 {#Output}

训练完成后，模型文件会输出到 `TrainingConfig` 指定的路径：

| 模式 | 输出文件 |
| --- | --- |
| Standard | `Xdows-Model.zip` + `Xdows-Model.onnx` |
| Flash | `Xdows-Model-Flash.zip` + `Xdows-Model-Flash.onnx` |
| Pro | `Xdows-Model-Pro.zip` + `Xdows-Model-Pro.onnx` + 4 个分支 `.onnx` |

Pro 默认输出 4 维 Fusion 模型 + 4 个分支模型，Invoker 加载时会自动启用 Stacking 集成路径。若只导出 519 维单模型（不含分支），Invoker 会走单模型降级路径，不加载分支文件。

## 批量评估 {#Evaluator}

`Xdows-Model-Evaluator` 对指定模式的模型在样本集上做批量评估，输出准确率、TPR、FPR、平均扫描耗时，可选导出误判样本 CSV。

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

`tests\Invoke-NativeConsistency.ps1` 会用同一批安全 PE 样本分别通过托管调用器和原生 DLL 执行扫描，比较两者结论是否一致、概率差是否在容差内：

```powershell
& 'D:\Code\Xdows-Model\tests\Invoke-NativeConsistency.ps1' -SkipBuild
```

修改 Invoker 或 Native 任一侧的特征提取或推理逻辑后，都必须跑一遍此测试，确保两端结论一致。
