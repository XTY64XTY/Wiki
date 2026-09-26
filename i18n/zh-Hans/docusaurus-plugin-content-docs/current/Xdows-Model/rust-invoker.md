---
title: Rust 调用器
description: xdows-model-invoker Rust crate、其内嵌模型集、基于 Xdows-Model 原生 C ABI 的生命周期，以及三档判定 API。
---

# Rust 调用器 {#RustInvoker}

`Xdows-Model-Invoker-Rust` 是一个独立仓库，提供 `xdows-model-invoker`，它是对与托管 Invoker 相同的模型和相同推理实现的安全 Rust 封装，支持 `Standard`、`Flash`、`Pro`、`Adaptive` 四种模式。

该 crate 是**薄绑定，而非重新实现**。它从不复制特征算法：它加载由 [Xdows-Model](https://github.com/XTY64XTY/Xdows-Model) 构建的 `Xdows-Model-Native.dll` 并调用其稳定的 C ABI，因此 Rust 调用方与 Xdows Security 驱动防护路径始终共享同一套特征提取器和同一个 ONNX Runtime 构建。

## 生命周期 {#Lifecycle}

该 API 与 C# 的 `ModelInvoker` 对应：加载原生库、初始化一种模式、扫描任意数量的文件，并在 drop 时自动释放会话。

```text
ModelLibrary::load_from_directory("runtime")
        │            （加载 Xdows-Model-Native.dll）
        ▼
ModelInvoker::initialize(library, mode, Some(model_dir))
        │            （释放内置模型到 model_dir，再初始化会话）
        ▼
model.scan_file(path)  ×  N      （复用同一会话，可多次扫描）
        │
        ▼
       drop                       （自动调用 XdowsModelNativeShutdown）
```

## 内嵌模型 {#Models}

由于原生库从磁盘加载模型，该 crate 用 `include_bytes!` 把整套模型烘焙进二进制，并在首次使用时落地。内嵌模型集与 `Xdows-Model-Invoker\Models\` 完全一致：

| 文件 | 使用方 |
| --- | --- |
| `Xdows-Model.onnx`, `Xdows-Model.threshold.json` | Standard、Adaptive |
| `Xdows-Model-Flash.onnx`, `Xdows-Model-Flash.threshold.json` | Flash、Adaptive |
| `Xdows-Model-Pro.onnx`, `Xdows-Model-Pro.threshold.json` | Pro、Adaptive |
| `Xdows-Model-Pro.manifest.json` | Pro、Adaptive |
| `Xdows-Model-Pro-{Standard,Flash,RawStat,Structural,ImportBehavior}.onnx` | Pro、Adaptive |

也就是 8 个 ONNX 文件加 4 个 JSON manifest。`ModelLibrary::ensure_models` 只写入某种模式所需的子集，而 `ensure_all_models` 写入整套——当部署希望一开始就具备所有模式时很有用。

两个辅助方法都是幂等的：已存在且长度与内嵌资源一致的文件不会被改动，因此刻意放置的模型绝不会被覆盖，重复调用开销也很低。

`ModelInvoker::initialize` 接受 `None` 作为模型目录，此时模型会释放到 `%TEMP%\xdows-model-invoker`——一个按用户隔离、无需提权、位置稳定的目录——并把该目录传给原生库。

:::note
之所以要一同发布 Pro manifest 和推荐阈值 manifest，是因为 Pro 模型集必须作为一个整体部署，而且推荐阈值定义了 `Suspicious` 区间。缺少 `Xdows-Model-Pro.threshold.json` 时，原生库会回退到固定阈值，`Suspicious` 便永远不会出现，尽管 API 仍会暴露该判定。
:::

## 模式 {#Modes}

```rust
use std::path::Path;
use xdows_model_invoker::{ModelInvoker, ModelLibrary, ModelMode};

let library = ModelLibrary::load_from_directory("runtime")?;

// One convenience constructor per mode
let standard = ModelInvoker::standard(&library, Some(Path::new("runtime")))?;
let flash    = ModelInvoker::flash(&library, Some(Path::new("runtime")))?;
let pro      = ModelInvoker::pro(&library, Some(Path::new("runtime")))?;
let adaptive = ModelInvoker::adaptive(&library, Some(Path::new("runtime")))?;

// Or pick the mode at runtime
let model = ModelInvoker::initialize(&library, ModelMode::Adaptive, Some(Path::new("runtime")))?;
```

## 判定结果 {#Verdicts}

`ScanResult::verdict` 暴露与托管实现和原生实现相同的三档判定，ABI 值也一致：

| 变体 | ABI 值 | 条件 |
| --- | --- | --- |
| `ScanVerdict::Clean` | 0 | 低于推荐阈值 |
| `ScanVerdict::Suspicious` | 1 | 达到或高于推荐阈值，且低于固定阈值 |
| `ScanVerdict::Malware` | 2 | 达到或高于固定阈值 |

`ScanResult` 还携带 `is_threat`（旧版布尔视图，只要不是 `Clean` 即为 true）、`0.0..=100.0` 范围内的百分比概率，以及可选的检测名。该 crate 会校验从 ABI 读回的每个字段——概率越界、判定值未知或 `is_threat` 非布尔，都会作为错误上报，而不会传给调用方。

```rust
let result = model.scan_file("samples/one.exe")?;
println!(
    "verdict={}, threat={}, probability={:.2}%, detection={:?}",
    result.verdict, result.is_threat, result.probability, result.detection_name
);
```

## 环境要求与部署 {#Requirements}

- Windows x64 或 ARM64
- Rust 1.74 或更高版本
- 由 Xdows-Model 构建的 `Xdows-Model-Native.dll`
- 与原生库架构匹配的 ONNX Runtime DLL

运行时目录至少应包含：

```text
runtime/
|-- Xdows-Model-Native.dll
|-- onnxruntime.dll
`-- onnxruntime_providers_shared.dll
```

ONNX 模型已内嵌在 crate 中，无需手动放置。只有运行时目录（ONNX Runtime DLL）需要与库一同分发。

## 错误与线程 {#Threading}

所有加载、初始化和扫描错误都以 `Result` 返回。原生错误字符串会先复制到 Rust `String`，再用原生库自身的释放函数释放，因此不会有分配跨越运行时边界。

`ModelLibrary` 可以克隆并在线程间共享。`ModelInvoker` 可以移动到其他线程，但刻意不实现 `Sync`：一个会话不能同时被多个线程扫描。要并行扫描，请为每个工作线程初始化一个会话。

## 验证 {#Verification}

常规检查不需要原生运行时：

```powershell
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test --all-targets
```

在具备原生运行时和 PE 样本时，可以运行真实的四模式冒烟测试（模型已内嵌，无需设置模型目录）：

```powershell
$env:XDOWS_NATIVE_DLL   = "D:\runtime\Xdows-Model-Native.dll"
$env:XDOWS_MODEL_DIR    = "D:\runtime"
$env:XDOWS_SAMPLE_FILE  = "D:\samples\sample.exe"
cargo test --test native_smoke -- --ignored --nocapture
```

同样的命令也会在仓库的 GitHub Actions 工作流中运行，因此每次推送都会强制检查 `fmt`、`clippy` 和单元测试。

## 版权说明 {#License}

MIT，Copyright (c) 2026 XTY64XTY。详见仓库的 `LICENSE.txt`。
