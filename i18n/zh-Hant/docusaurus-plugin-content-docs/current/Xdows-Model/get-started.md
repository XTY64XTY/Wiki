---
title: Xdows Model
description: Xdows Model 是 Xdows Security 的本地惡意檔案模型倉庫，提供 Standard、Flash、Pro、Adaptive 四種 ONNX 推理模式、五分支 Pro Stacking 集成、訓練工具、評估工具和原生執行階段。
---

# Xdows Model

Xdows Model 是 Xdows Security 的本地靜態掃描模型倉庫。它使用 ML.NET LightGBM 訓練 GBDT 模型，使用 ONNX Runtime 執行推理，並提供託管呼叫庫、命令列呼叫器、批次評估工具和供 Xdows Security 驅動程式防護路徑呼叫的 C ABI 原生執行階段。

## 模型模式 {#Modes}

倉庫目前維護四種推理模式：

| 模式 | 入口模型 | 適用情境 | 特徵維度 | 預設判毒閾值 |
| --- | --- | --- | --- | --- |
| Standard | `Xdows-Model.onnx` | 預設靜態掃描，平衡準確率與速度 | 299 | 92% |
| Flash | `Xdows-Model-Flash.onnx` | 快速預篩，僅讀取檔案頭尾 | 68 | 96% |
| Pro | `Xdows-Model-Pro.onnx` 及五個分支模型 | 高成本深度靜態掃描，5 分支 Stacking 集成 | 5143 | 94% |
| Adaptive | Flash + Standard + Pro | 分級路由，按需逐級升級 | 動態 | 沿用各級閾值 |

Pro 模式不是單模型，而是 **5 分支 Stacking 集成**：

- Standard 分支：299 維完整 PE/位元組統計特徵
- Flash 分支：68 維頭尾區域特徵
- RawStat 分支：120 維（3 段 × 40 維）固定原始位元組統計
- Structural 分支：32 維 PE 結構特徵
- ImportBehavior 分支：4624 維匯入行為特徵（512 個 DLL 雜湊桶 + 4096 個 API 雜湊桶 + 16 項匯入表統計）
- Fusion 模型：5 維（五個分支的 OOF 機率），用邏輯迴歸融合出最終機率

Pro 總特徵維度固定為 **5143**（299 + 68 + 120 + 32 + 4624），由 `FeatureSchema` 常數約束，不存在「動態 raw 位元組擴展」。Invoker 在載入 Pro 時會讀取 Fusion 模型的輸入維度：若維度為 **5**，則驗證 `Xdows-Model-Pro.manifest.json` 並啟用五分支 Stacking 路徑；若維度為 **4**，則走舊版四分支路徑，不需 manifest 直接載入 `-Standard`、`-Flash`、`-RawStat`、`-Structural`；若維度為 **5143**（或舊版 **519**），則走單模型路徑，直接把混合特徵送入 Fusion 模型本身。

Adaptive 模式按 **Flash → Standard → Pro** 的順序逐級路由：

1. 先用 Flash 快速判定，若機率處於安全區（`probability ≤ 100 − FlashThreshold`）直接放行；
2. 否則升級到 Standard 重新判定，若仍處於安全區放行；
3. 否則升級到 Pro 做最終判定。

這樣可在保證極低誤報率的前提下，對絕大多數安全檔案只付出 Flash 成本。

## 判定結果 {#Verdicts}

所有模式和全部三種實作（託管 Invoker、原生執行階段和 Rust Invoker）共用同一套三檔判定：

| 判定 | 意義 | 條件 |
| --- | --- | --- |
| `Clean` | 無威脅 | `probability` 低於建議閾值 |
| `Suspicious` | 需要留意 | `probability` 達到或超過建議閾值，且低於固定閾值 |
| `Malware` | 有威脅 | `probability` 達到或超過固定閾值 |

建議閾值來自隨每個模型一同發布的 `<model>.threshold.json`，且永遠不會覆寫固定閾值。只讀取布林值的舊呼叫端可以繼續使用 `IsThreat`，其對任何非 `Clean` 的結果皆為 true。

## 倉庫組成 {#Projects}

| 專案 | 作用 |
| --- | --- |
| `Xdows-Model-Config` | 訓練路徑、模型輸出路徑、閾值、超參數、`FeatureSchema` 常數、`ProBranches` 佈局權威來源和 `ProModelManifest` 契約 |
| `Xdows-Model-Maker` | 互動式訓練與樣本清洗工具，支援 Standard、Flash、Pro（含五分支 Stacking），以及內容雜湊去重和分組隔離的資料集切分 |
| `Xdows-Model-Invoker` | 託管推理庫，負責模型載入、特徵提取、ONNX 推理和閾值判定 |
| `Xdows-Model-Caller` | 命令列呼叫範例，支援 `-s`、`-f`、`-p`、`-a` 四種模式 |
| `Xdows-Model-Evaluator` | 批次評估工具，輸出準確率、TPR、FPR、平均掃描耗時和誤判樣本 CSV |
| `Xdows-Model-Native` | C ABI 原生封裝，供 Xdows Security 主程式在驅動程式防護路徑中直接呼叫；同時支援五分支與舊版四分支 Pro 佈局 |

詳細的模式架構、特徵契約和路由流程見 [架構說明](./architecture)。Invoker 庫另有一份獨立的 Rust 移植，位於 `Xdows-Model-Invoker-Rust` 倉庫，見 [Rust Invoker](./rust-invoker)。

## 命令列呼叫 {#CLI}

```powershell
Xdows-Model-Caller.exe [-s|-f|-p|-a] [--model <模型路径>]
```

模式參數互斥：

- `-s`：使用 Standard 模型（預設）
- `-f`：使用 Flash 模型
- `-p`：使用 Pro 模型
- `-a`：使用 Adaptive 模式

`--model` 可指定模型檔案路徑；Adaptive 模式下可指定包含全部模型的目錄。不帶 `--model` 時使用執行目錄下的預設模型檔案。Adaptive 模式接收的目錄中應包含 Standard、Flash、Pro 三個基礎模型；若 Pro 為 Stacking 形態，還需包含 Pro 分支模型檔案和 Pro manifest。

範例：

```powershell
Xdows-Model-Caller.exe
Xdows-Model-Caller.exe -p
Xdows-Model-Caller.exe -a --model "D:\Models"
```

呼叫器初始化後會進入互動模式，連續輸入檔案路徑進行掃描，輸入 `Help` 查看說明，輸入 `Quit` 結束。

## C# 接入 {#CSharp}

```csharp
using Xdows_Model_Config;
using Xdows_Model_Invoker;

ModelInvoker.ConfigureThresholds(new TrainingConfig());

// 按需選擇一種初始化
ModelInvoker.Initialize();        // Standard
ModelInvoker.InitializeFlash();   // Flash
ModelInvoker.InitializePro();     // Pro
ModelInvoker.InitializeAdaptive(); // Adaptive

var (isVirus, probability) = ModelInvoker.ScanFile(@"C:\Samples\app.exe");

ModelInvoker.UnloadModel();
```

每個初始化方法都可以接收一個選用的模型路徑參數。Adaptive 模式接收的是模型目錄，目錄中應包含全部三種基礎模型檔案；若 Pro 為 Stacking 形態，還需包含 Pro 分支模型和 Pro manifest。

## 原生執行階段 {#Native}

Xdows Security 主程式不透過驅動程式執行 .NET 模型，也不透過驅動程式啟動命令列掃描器。驅動程式防護路徑由主程式載入 `Xdows-Model-Native.dll`，再由原生執行階段呼叫 ONNX Runtime 完成本地推理。

C ABI 核心介面（所有函式使用 `__stdcall` 呼叫慣例，透過 `XDOWS_MODEL_NATIVE_API` 巨集匯出）：

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

原生執行階段與託管 Invoker 一樣，會依 Fusion 模型的輸入維度決定 Pro 佈局：維度為 `5` 時載入五個分支（含 `-ImportBehavior`），輸入為 5143 維混合特徵；維度為 `4` 時沿用舊版四分支的 519 維行為。其他維度會在初始化時直接拒絕，而不是在掃描期間默默降級。

## 部署資產 {#Assets}

模型不再內嵌於組件中。`Xdows-Model-Invoker` 將其保存在專用的 `Models` 目錄（來源：`Xdows-Model-Invoker\Models\`，建置輸出：`Xdows-Model-Invoker.dll` 同層的 `Models\`），以 `PreserveNewest` 複製，並優先於該目錄尋找，只有在此佈局出現前建立的部署才會回退到組件目錄。

發布 Xdows Security 時，應用輸出必須包含整套模型：

- `Xdows-Model.onnx` 和 `Xdows-Model.threshold.json`
- `Xdows-Model-Flash.onnx` 和 `Xdows-Model-Flash.threshold.json`
- `Xdows-Model-Pro.onnx`、`Xdows-Model-Pro.threshold.json` 和 `Xdows-Model-Pro.manifest.json`
- 五個 Pro 分支模型（`-Standard`、`-Flash`、`-RawStat`、`-Structural`、`-ImportBehavior`）
- `Xdows-Model-Native.dll`
- `onnxruntime.dll`
- `onnxruntime_providers_shared.dll`

缺少 manifest 的 Pro 模型集無法載入：對於沒有 manifest 的五輸入 Fusion 模型，Invoker 會直接拒絕，而不是猜測分支佈局。

## 注意事項 {#Notes}

- 不要提交真實惡意樣本到倉庫。安全樣本規範見 `tests\samples\README.md`。
- Pro 特徵維度固定為 5143，由 `FeatureSchema` 常數約束；更新 Pro 訓練時不要把分支維度寫死成其他值。
- Pro 分支維度、偏移、檔名後綴、順序和佈局指紋只有一個權威來源：`Xdows-Model-Config\ProBranches.cs`。不要在 Maker 或 Invoker 中另行複製一份該表格。
- 特徵佈局只允許追加。新的特徵群組只能附加到向量末端；既有偏移不得移動。
- 閾值是業務策略，不是模型本身的一部分；固定閾值留在 `TrainingConfig`，建議閾值則在訓練時校準並以 `*.threshold.json` 發布。
- 原生執行階段和託管 Invoker 必須使用同一套模型檔案、特徵契約和閾值設定。
- 修改 `FeatureSchema` 會導致舊模型不相容，需要重新訓練所有模式；請遞增 `FeatureSchema.Version`，讓 manifest 拒絕過期模型，而不是讓程式碼默默改變規則。

## 版權說明 {#License}

該專案使用 MIT 授權條款，詳情請參閱 [LICENSE](https://github.com/XTY64XTY/Xdows-Model/blob/main/LICENSE.txt)。
