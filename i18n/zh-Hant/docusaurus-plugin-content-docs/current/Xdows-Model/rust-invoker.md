---
title: Rust Invoker
description: xdows-model-invoker Rust crate、其內嵌模型集、基於 Xdows-Model 原生 C ABI 的生命週期，以及其三檔判定 API。
---

# Rust Invoker {#RustInvoker}

`Xdows-Model-Invoker-Rust` 是一個獨立倉庫，提供 `xdows-model-invoker`，這是對同一套模型和與託管 Invoker 相同推理實作的安全 Rust 封裝。它支援 `Standard`、`Flash`、`Pro` 和 `Adaptive` 模式。

該 crate 是**輕量繫結，而非重新實作**。它從不複製特徵演算法：它載入由 [Xdows-Model](https://github.com/XTY64XTY/Xdows-Model) 建置的 `Xdows-Model-Native.dll`，並呼叫其穩定的 C ABI，因此 Rust 呼叫端和 Xdows Security 驅動程式防護路徑永遠共用同一套特徵提取器和同一個 ONNX Runtime 建置。

## 生命週期 {#Lifecycle}

此 API 對應 C# 的 `ModelInvoker`：載入原生程式庫、初始化一種模式、掃描任意數量的檔案，並在 drop 時自動釋放工作階段。

```text
ModelLibrary::load_from_directory("runtime")
        │            （載入 Xdows-Model-Native.dll）
        ▼
ModelInvoker::initialize(library, mode, Some(model_dir))
        │            （釋放內建模型到 model_dir，再初始化工作階段）
        ▼
model.scan_file(path)  ×  N      （重複使用同一工作階段，可多次掃描）
        │
        ▼
       drop                       （自動呼叫 XdowsModelNativeShutdown）
```

## 內嵌模型 {#Models}

由於原生程式庫從磁碟載入模型，該 crate 以 `include_bytes!` 將整套模型烘入二進位檔，並在首次使用時實體化。內嵌的模型集與 `Xdows-Model-Invoker\Models\` 完全一致：

| 檔案 | 需要它的模式 |
| --- | --- |
| `Xdows-Model.onnx`、`Xdows-Model.threshold.json` | Standard、Adaptive |
| `Xdows-Model-Flash.onnx`、`Xdows-Model-Flash.threshold.json` | Flash、Adaptive |
| `Xdows-Model-Pro.onnx`、`Xdows-Model-Pro.threshold.json` | Pro、Adaptive |
| `Xdows-Model-Pro.manifest.json` | Pro、Adaptive |
| `Xdows-Model-Pro-{Standard,Flash,RawStat,Structural,ImportBehavior}.onnx` | Pro、Adaptive |

即 8 個 ONNX 檔案加上 4 份 JSON manifest。`ModelLibrary::ensure_models` 只寫入某模式需要的子集，而 `ensure_all_models` 會寫入整套檔案——當部署希望一開始就備妥所有模式時相當有用。

兩個輔助函式都是冪等的：若既有檔案的長度已與內嵌資產相符，就不會被觸碰，因此刻意放置的模型永遠不會被覆寫，重複呼叫也很便宜。

`ModelInvoker::initialize` 接受以 `None` 作為模型目錄，此時模型會解壓到 `%TEMP%\xdows-model-invoker`——一個每位使用者、非提權、穩定的位置——並將該目錄傳給原生程式庫。

:::note
之所以一併發布 Pro manifest 和建議閾值 manifest，是因為 Pro 模型集必須作為一個整體部署，且建議閾值定義了 `Suspicious` 區段。缺少 `Xdows-Model-Pro.threshold.json` 時，原生程式庫會退回固定閾值，`Suspicious` 便永遠不會出現，儘管 API 仍會呈現它。
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

## 判定結果 {#Verdicts}

`ScanResult::verdict` 呈現與託管、原生實作相同的三檔判定，並使用相同的 ABI 值：

| 變體 | ABI 值 | 條件 |
| --- | --- | --- |
| `ScanVerdict::Clean` | 0 | 低於建議閾值 |
| `ScanVerdict::Suspicious` | 1 | 達到或超過建議閾值，且低於固定閾值 |
| `ScanVerdict::Malware` | 2 | 達到或超過固定閾值 |

`ScanResult` 另外攜帶 `is_threat`（舊版布林視圖，對任何非 `Clean` 的結果皆為 true）、以百分比表示且範圍為 `0.0..=100.0` 的機率，以及一個選用的偵測名稱。該 crate 會驗證它從 ABI 讀回的每個欄位——超出範圍的機率、未知的判定值或非布林的 `is_threat` 都會以錯誤呈現，而不是傳給呼叫端。

```rust
let result = model.scan_file("samples/one.exe")?;
println!(
    "verdict={}, threat={}, probability={:.2}%, detection={:?}",
    result.verdict, result.is_threat, result.probability, result.detection_name
);
```

## 需求與部署 {#Requirements}

- Windows x64 或 ARM64
- Rust 1.74 或更新版本
- 由 Xdows-Model 建置的 `Xdows-Model-Native.dll`
- 與原生程式庫架構相符的 ONNX Runtime DLL

執行階段目錄至少必須包含：

```text
runtime/
|-- Xdows-Model-Native.dll
|-- onnxruntime.dll
`-- onnxruntime_providers_shared.dll
```

ONNX 模型已內嵌於 crate 中，不需手動放置。只有執行階段目錄（ONNX Runtime DLL）必須隨程式庫一同散布。

## 錯誤與執行緒 {#Threading}

所有載入、初始化和掃描錯誤都以 `Result` 回傳。原生錯誤字串會先複製到 Rust 的 `String`，再用原生程式庫自帶的釋放函式釋放，因此不會有記憶體配置跨越執行階段邊界。

`ModelLibrary` 可以被複製並線上程之間共用。`ModelInvoker` 可以移動到另一個執行緒，但刻意不是 `Sync`：單一工作階段不能同時從多個執行緒掃描。若要平行掃描，請為每個工作者初始化一個工作階段。

## 驗證 {#Verification}

例行檢查不需要原生執行階段：

```powershell
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test --all-targets
```

在原生執行階段和一個 PE 樣本就緒時，可以執行真正的四模式冒煙測試（模型已內嵌，因此不需設定模型目錄）：

```powershell
$env:XDOWS_NATIVE_DLL   = "D:\runtime\Xdows-Model-Native.dll"
$env:XDOWS_MODEL_DIR    = "D:\runtime"
$env:XDOWS_SAMPLE_FILE  = "D:\samples\sample.exe"
cargo test --test native_smoke -- --ignored --nocapture
```

倉庫的 GitHub Actions 工作流程會執行相同的命令，因此每次推送都會強制執行 `fmt`、`clippy` 和單元測試。

## 版權說明 {#License}

MIT，Copyright (c) 2026 XTY64XTY。詳見倉庫的 `LICENSE.txt`。
