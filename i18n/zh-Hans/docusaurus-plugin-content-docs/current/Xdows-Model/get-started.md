---
title: Xdows Model
description: Xdows Model 是 Xdows Security 的本地恶意文件模型仓库，提供 Standard、Flash、Pro、Adaptive 四种 ONNX 推理模式、训练工具、评估工具和原生运行时。
---

# Xdows Model

Xdows Model 是 Xdows Security 的本地静态扫描模型仓库。它使用 ML.NET LightGBM 训练 GBDT 模型，使用 ONNX Runtime 执行推理，并提供托管调用库、命令行调用器、批量评估工具和供 Xdows Security 驱动防护路径调用的 C ABI 原生运行时。

## 模型模式 {#Modes}

仓库当前维护四种推理模式：

| 模式 | 入口模型 | 适用场景 | 特征维度 | 默认判毒阈值 |
| --- | --- | --- | --- | --- |
| Standard | `Xdows-Model.onnx` | 默认静态扫描，平衡准确率与速度 | 299 | 92% |
| Flash | `Xdows-Model-Flash.onnx` | 快速预筛，仅读取文件头尾 | 68 | 96% |
| Pro | `Xdows-Model-Pro.onnx` 及四个分支模型 | 高成本深度静态扫描，4 分支 Stacking 集成 | 519 | 94% |
| Adaptive | Flash + Standard + Pro | 分级路由，按需逐级升级 | 动态 | 沿用各级阈值 |

Pro 模式不是单模型，而是 **4 分支 Stacking 集成**：

- Standard 分支：299 维完整 PE/字节统计特征
- Flash 分支：68 维头尾区域特征
- RawStat 分支：120 维（3 段 × 40 维）固定原始字节统计
- Structural 分支：32 维 PE 结构特征
- Fusion 模型：4 维（四个分支的 OOF 概率），用逻辑回归融合出最终概率

Pro 总特征维度固定为 **519**（299 + 68 + 120 + 32），由 `FeatureSchema` 常量约束，不存在"动态 raw 字节扩展"。Invoker 在加载 Pro 时会读取 Fusion 模型的输入维度：若维度为 **4** 则启用 Stacking 集成路径并加载四个分支模型，若维度为 **519** 则走单模型路径直接把混合特征送入 Fusion 模型本身。

Adaptive 模式按 **Flash → Standard → Pro** 的顺序逐级路由：

1. 先用 Flash 快速判定，若概率处于安全区（`probability ≤ 100 − FlashThreshold`）直接放行；
2. 否则升级到 Standard 重新判定，若仍处于安全区放行；
3. 否则升级到 Pro 做最终判定。

这样可在保证极低误报率的前提下，对绝大多数安全文件只付出 Flash 成本。

## 仓库组成 {#Projects}

| 项目 | 作用 |
| --- | --- |
| `Xdows-Model-Config` | 训练路径、模型输出路径、阈值、超参数和 `FeatureSchema` 常量 |
| `Xdows-Model-Maker` | 交互式训练与样本清洗工具，支持 Standard、Flash、Pro（含 Stacking） |
| `Xdows-Model-Invoker` | 托管推理库，负责模型加载、特征提取、ONNX 推理和阈值判定 |
| `Xdows-Model-Caller` | 命令行调用示例，支持 `-s`、`-f`、`-p`、`-a` 四种模式 |
| `Xdows-Model-Evaluator` | 批量评估工具，输出准确率、TPR、FPR、平均耗时和误判样本 CSV |
| `Xdows-Model-Native` | C ABI 原生封装，供 Xdows Security 主程序在驱动防护路径中直接调用 |

详细的模式架构、特征契约和路由流程见 [架构说明](./architecture)。

## 命令行调用 {#CLI}

```powershell
Xdows-Model-Caller.exe [-s|-f|-p|-a] [--model <模型路径>]
```

模式参数互斥：

- `-s`：使用 Standard 模型（默认）
- `-f`：使用 Flash 模型
- `-p`：使用 Pro 模型
- `-a`：使用 Adaptive 模式

`--model` 可指定模型文件路径；Adaptive 模式下可指定包含全部模型的目录。不带 `--model` 时使用运行目录下的默认模型文件。Adaptive 模式接收的目录中应包含 Standard、Flash、Pro 三个基础模型；若 Pro 为 Stacking 形态，还需包含四个 Pro 分支模型文件。

示例：

```powershell
Xdows-Model-Caller.exe
Xdows-Model-Caller.exe -p
Xdows-Model-Caller.exe -a --model "D:\Models"
```

调用器初始化后会进入交互模式，连续输入文件路径进行扫描，输入 `Help` 查看帮助，输入 `Quit` 退出。

## C# 接入 {#CSharp}

```csharp
using Xdows_Model_Config;
using Xdows_Model_Invoker;

ModelInvoker.ConfigureThresholds(new TrainingConfig());

// 按需选择一种初始化
ModelInvoker.Initialize();        // Standard
ModelInvoker.InitializeFlash();   // Flash
ModelInvoker.InitializePro();     // Pro
ModelInvoker.InitializeAdaptive(); // Adaptive

var (isVirus, probability) = ModelInvoker.ScanFile(@"C:\Samples\app.exe");

ModelInvoker.UnloadModel();
```

每个初始化方法都可以接收一个可选的模型路径参数。Adaptive 模式接收的是模型目录，目录中应包含全部三种基础模型文件（若 Pro 为 Stacking 形态，还需包含四个分支模型）。

## 原生运行时 {#Native}

Xdows Security 主程序不通过驱动运行 .NET 模型，也不通过驱动启动命令行扫描器。驱动防护路径由主程序加载 `Xdows-Model-Native.dll`，再由原生运行时调用 ONNX Runtime 完成本地推理。

C ABI 核心接口（所有函数使用 `__stdcall` 调用约定，通过 `XDOWS_MODEL_NATIVE_API` 宏导出）：

```c
typedef enum {
    XdowsModelNativeModeStandard = 0,
    XdowsModelNativeModeFlash    = 1,
    XdowsModelNativeModePro      = 2,
    XdowsModelNativeModeAdaptive = 3
} XDOWS_MODEL_NATIVE_MODE;

XDOWS_MODEL_NATIVE_API int  __stdcall XdowsModelNativeInitialize(const wchar_t* modelDirectory, int mode, void** session);
XDOWS_MODEL_NATIVE_API int  __stdcall XdowsModelNativeScanFile(void* session, const wchar_t* filePath, XDOWS_MODEL_NATIVE_SCAN_RESULT* result);
XDOWS_MODEL_NATIVE_API void __stdcall XdowsModelNativeShutdown(void* session);
XDOWS_MODEL_NATIVE_API void __stdcall XdowsModelNativeFreeString(wchar_t* value);
```

发布 Xdows Security 时，应用输出应包含：

- `Xdows-Model.onnx`
- `Xdows-Model-Flash.onnx`
- `Xdows-Model-Pro.onnx` 及四个分支模型（`-Standard`、`-Flash`、`-RawStat`、`-Structural`）
- `Xdows-Model-Native.dll`
- `onnxruntime.dll`
- `onnxruntime_providers_shared.dll`

## 注意事项 {#Notes}

- 不要提交真实恶意样本到仓库。安全样本规范见 `tests\samples\README.md`。
- Pro 特征维度固定为 519，由 `FeatureSchema` 常量约束；更新 Pro 训练时不要把分支维度写死成其他值。
- 阈值是业务策略，不是模型本身的一部分；发布前应使用目标样本集重新评估。
- 原生运行时和托管 Invoker 必须使用同一套模型文件、特征契约和阈值配置。
- 修改 `FeatureSchema` 会导致旧模型不兼容，需要重新训练所有模式。

## 版权说明 {#License}

该项目使用 MIT 许可证，详情请参阅 [LICENSE](https://github.com/XTY64XTY/Xdows-Model/blob/main/LICENSE.txt)。
