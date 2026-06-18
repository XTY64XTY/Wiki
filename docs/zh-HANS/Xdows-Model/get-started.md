---
title: Xdows Model
description: Xdows Model 是 Xdows Security 使用的本地恶意文件模型仓库，提供 Standard、Flash、Pro 三种 ONNX 推理模式、训练工具、评估工具和原生运行时。
---

# Xdows Model

> 项目仓库：<https://github.com/XTY64XTY/Xdows-Model>

Xdows Model 是 Xdows Security 的本地静态扫描模型仓库。它使用 ML.NET LightGBM 训练模型，使用 ONNX Runtime 执行推理，并提供托管调用库、命令行调用器、评估工具和供 Xdows Security 驱动防护路径调用的原生运行时。

## 模型模式

当前仓库维护三种 ONNX 模型：

| 模式 | 文件 | 适用目标 | 特征契约 | 默认判毒阈值 |
| --- | --- | --- | --- | --- |
| Standard | `Xdows-Model.onnx` | 默认静态扫描 | 299 维完整 PE/字节统计特征 | 92% |
| Flash | `Xdows-Model-Flash.onnx` | 快速预筛 | 68 维头尾区域特征 | 96% |
| Pro | `Xdows-Model-Pro.onnx` | 更高成本的深度静态扫描 | Standard + Flash + 32 维 PE 结构特征 + 动态 raw 节区字节 | 94% |

Pro 模式不是固定维度模型。Invoker 会读取 ONNX 的 `Features` 输入维度，再反推出每个节区使用的 raw 字节数。重新训练 Pro 模型后，只要维度能被当前混合特征契约解析，调用端就不需要硬编码新的特征长度。

## 仓库组成

| 项目 | 作用 |
| --- | --- |
| `Xdows-Model-Config` | 训练路径、模型输出路径、阈值和超参数配置 |
| `Xdows-Model-Maker` | 交互式训练与样本清洗工具，可训练 Standard、Flash、Pro |
| `Xdows-Model-Invoker` | 托管推理库，负责模型加载、特征提取、ONNX 推理和阈值判定 |
| `Xdows-Model-Caller` | 命令行调用示例，可用 `-s`、`-f`、`-p` 选择模型 |
| `Xdows-Model-Evaluator` | 批量评估工具，可输出准确率、TPR、FPR、平均扫描耗时和误判样本 CSV |
| `Xdows-Model-Native` | C ABI 原生封装，供 Xdows Security 主程序在驱动防护路径中直接调用 |

## 推理流程

1. 选择模型模式并加载对应 ONNX 文件。
2. 检查目标文件是否存在。
3. Standard 模式要求文件满足 PE 头校验；Flash 和 Pro 按各自特征提取器读取文件内容。
4. 提取与当前模型模式匹配的 `Features` 张量。
5. 调用 ONNX Runtime 读取 `Probability.output`。
6. 按 `TrainingConfig` 中的模式阈值输出安全或恶意判定。

默认模型发现顺序为运行目录、程序集嵌入资源、程序集所在目录。生产集成时应确保三个 `.onnx` 文件与 ONNX Runtime 原生依赖随应用一同发布。

## 命令行调用

```powershell
Xdows-Model-Caller.exe <文件路径> [-s] [-f] [-p]
```

参数互斥：

- `-s`：使用 Standard 模型。
- `-f`：使用 Flash 模型。
- `-p`：使用 Pro 模型。

不传模型参数时默认使用 Standard。

## C# 接入

```csharp
using Xdows_Model_Config;
using Xdows_Model_Invoker;

ModelInvoker.ConfigureThresholds(new TrainingConfig());
ModelInvoker.InitializePro();

var (isVirus, probability) = ModelInvoker.ScanFile(@"C:\Samples\app.exe");

ModelInvoker.UnloadModel();
```

Standard 使用 `Initialize()`，Flash 使用 `InitializeFlash()`，Pro 使用 `InitializePro()`。也可以向初始化方法传入自定义 ONNX 路径。

## 训练与评估

`Xdows-Model-Maker` 是交互式训练工具。默认样本目录来自 `TrainingConfig`：

- 黑样本：`D:\Code\Model\Files\Black`
- 白样本：`D:\Code\Model\Files\White`

训练菜单可选择 Standard、Flash、Pro 中的一个或多个模型。Pro 训练会从 `ProExpansionStartBytesPerSection` 开始，按 `ProExpansionFactor` 扩展 raw 字节窗口，直到达到 `ProExpansionMaxBytesPerSection`、AUC 增益低于阈值或超过耐心步数。

批量评估示例：

```powershell
dotnet run --project D:\Code\Xdows-Model\Xdows-Model-Evaluator -- --mode all --limit 700 --csv hard-cases.csv
```

常用参数：

- `--mode all|standard|flash|pro`
- `--black <folder>`
- `--white <folder>`
- `--limit <n>`
- `--csv <path>`
- `--standard-model <path>`
- `--flash-model <path>`
- `--pro-model <path>`

## 与 Xdows Security 的关系

Xdows Security 主程序不在驱动里运行 .NET 模型，也不通过驱动启动命令行扫描器。驱动防护路径由主程序加载 `Xdows-Model-Native.dll`，再由原生运行时调用 ONNX Runtime 完成本地推理。

发布 Xdows Security 时，应用输出应包含：

- `Xdows-Model.onnx`
- `Xdows-Model-Flash.onnx`
- `Xdows-Model-Pro.onnx`
- `Xdows-Model-Native.dll`
- `onnxruntime.dll`
- `onnxruntime_providers_shared.dll`

## 注意事项

- 不要提交真实恶意样本到仓库。
- 更新 Pro 训练或推理时，不要把 Pro 特征长度写死为某个固定值。
- 阈值是业务策略，不是模型本身的一部分；发布前应使用目标样本集重新评估。
- 原生运行时和托管 Invoker 应保持同一套模型文件、特征契约和阈值配置。
