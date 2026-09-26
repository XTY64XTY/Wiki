---
title: Rust Invoker
description: The xdows-model-invoker Rust crate, its embedded model set, its lifecycle over the Xdows-Model native C ABI, and its three-tier verdict API.
---

# Rust Invoker {#RustInvoker}

`Xdows-Model-Invoker-Rust` is a separate repository that provides `xdows-model-invoker`, a safe Rust wrapper around the same models and the same inference implementation as the managed Invoker. It supports the `Standard`, `Flash`, `Pro`, and `Adaptive` modes.

The crate is a **thin binding, not a reimplementation**. It never copies the feature algorithms: it loads `Xdows-Model-Native.dll` built from [Xdows-Model](https://github.com/XTY64XTY/Xdows-Model) and calls its stable C ABI, so a Rust caller and the Xdows Security driver-protection path always share one feature extractor and one ONNX Runtime build.

## Lifecycle {#Lifecycle}

The API mirrors the C# `ModelInvoker`: load the native library, initialize one mode, scan any number of files, and release the session automatically on drop.

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

## Embedded Models {#Models}

Because the native library loads models from disk, the crate bakes the whole model set into the binary with `include_bytes!` and materializes it on first use. The embedded set mirrors `Xdows-Model-Invoker\Models\` exactly:

| File | Needed by |
| --- | --- |
| `Xdows-Model.onnx`, `Xdows-Model.threshold.json` | Standard, Adaptive |
| `Xdows-Model-Flash.onnx`, `Xdows-Model-Flash.threshold.json` | Flash, Adaptive |
| `Xdows-Model-Pro.onnx`, `Xdows-Model-Pro.threshold.json` | Pro, Adaptive |
| `Xdows-Model-Pro.manifest.json` | Pro, Adaptive |
| `Xdows-Model-Pro-{Standard,Flash,RawStat,Structural,ImportBehavior}.onnx` | Pro, Adaptive |

That is 8 ONNX files plus 4 JSON manifests. `ModelLibrary::ensure_models` writes only the subset a mode needs, while `ensure_all_models` writes the full set — useful when a deployment wants every mode available up front.

Both helpers are idempotent: an existing file whose length already matches the embedded asset is left untouched, so a deliberately placed model is never overwritten and repeated calls are cheap.

`ModelInvoker::initialize` accepts `None` as the model directory, in which case the models are extracted into `%TEMP%\xdows-model-invoker` — a per-user, non-elevated, stable location — and that directory is passed to the native library.

:::note
The Pro manifest and the recommended-threshold manifests are shipped because the Pro model set must be deployed as a unit and because the recommended threshold defines the `Suspicious` band. Without `Xdows-Model-Pro.threshold.json` the native library falls back to the fixed threshold and `Suspicious` simply never occurs, even though the API still exposes it.
:::

## Modes {#Modes}

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

## Verdicts {#Verdicts}

`ScanResult::verdict` exposes the same three-tier verdict as the managed and native implementations, with the same ABI values:

| Variant | ABI value | Condition |
| --- | --- | --- |
| `ScanVerdict::Clean` | 0 | Below the recommended threshold |
| `ScanVerdict::Suspicious` | 1 | At or above the recommended threshold, below the fixed threshold |
| `ScanVerdict::Malware` | 2 | At or above the fixed threshold |

`ScanResult` also carries `is_threat` (the legacy boolean view, true for anything other than `Clean`), the probability as a percentage in `0.0..=100.0`, and an optional detection name. The crate validates every field it reads back from the ABI — an out-of-range probability, an unknown verdict value, or a non-boolean `is_threat` is surfaced as an error rather than passed to the caller.

```rust
let result = model.scan_file("samples/one.exe")?;
println!(
    "verdict={}, threat={}, probability={:.2}%, detection={:?}",
    result.verdict, result.is_threat, result.probability, result.detection_name
);
```

## Requirements and Deployment {#Requirements}

- Windows x64 or ARM64
- Rust 1.74 or later
- `Xdows-Model-Native.dll` built from Xdows-Model
- An ONNX Runtime DLL matching the native library's architecture

The runtime directory must contain at least:

```text
runtime/
|-- Xdows-Model-Native.dll
|-- onnxruntime.dll
`-- onnxruntime_providers_shared.dll
```

The ONNX models are embedded in the crate and do not need to be placed manually. Only the runtime directory (the ONNX Runtime DLLs) has to be distributed alongside the library.

## Errors and Threading {#Threading}

All load, initialize, and scan errors are returned as `Result`. A native error string is copied into a Rust `String` first and then released with the native library's own free function, so no allocation crosses a runtime boundary.

`ModelLibrary` can be cloned and shared between threads. `ModelInvoker` can be moved to another thread but is deliberately not `Sync`: one session cannot be scanned from several threads at once. To scan in parallel, initialize one session per worker.

## Verification {#Verification}

Regular checks need no native runtime:

```powershell
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test --all-targets
```

With the native runtime and a PE sample available, the real four-mode smoke test can be run (models are embedded, so no model directory needs to be set):

```powershell
$env:XDOWS_NATIVE_DLL   = "D:\runtime\Xdows-Model-Native.dll"
$env:XDOWS_MODEL_DIR    = "D:\runtime"
$env:XDOWS_SAMPLE_FILE  = "D:\samples\sample.exe"
cargo test --test native_smoke -- --ignored --nocapture
```

The same commands run in the repository's GitHub Actions workflow, so `fmt`, `clippy`, and the unit tests are enforced on every push.

## License {#License}

MIT, Copyright (c) 2026 XTY64XTY. See the repository's `LICENSE.txt`.
