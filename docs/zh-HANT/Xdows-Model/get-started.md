---
title: Xdows Model
description: Xdows Model 是 Xdows Security 使用的本機惡意檔案模型倉庫，提供 Standard、Flash、Pro 三種 ONNX 推理模式、訓練工具、評估工具和原生執行階段。
---

# Xdows Model

Xdows Model 是 Xdows Security 的本機靜態掃描模型倉庫。它使用 ML.NET LightGBM 訓練模型，使用 ONNX Runtime 執行推理，並提供託管呼叫庫、命令列呼叫器、評估工具和供 Xdows Security 驅動防護路徑呼叫的原生執行階段。

## 模型模式

目前倉庫維護三種 ONNX 模型：

| 模式 | 檔案 | 適用目標 | 特徵契約 | 預設判毒閾值 |
| --- | --- | --- | --- | --- |
| Standard | `Xdows-Model.onnx` | 預設靜態掃描 | 299 維完整 PE/位元組統計特徵 | 92% |
| Flash | `Xdows-Model-Flash.onnx` | 快速預篩 | 68 維頭尾區域特徵 | 96% |
| Pro | `Xdows-Model-Pro.onnx` | 更高成本的深度靜態掃描 | Standard + Flash + 32 維 PE 結構特徵 + 動態 raw 節區位元組 | 94% |

Pro 模式不是固定維度模型。Invoker 會讀取 ONNX 的 `Features` 輸入維度，再反推出每個節區使用的 raw 位元組數。重新訓練 Pro 模型後，只要維度能被目前混合特徵契約解析，呼叫端就不需要硬編碼新的特徵長度。

## 倉庫組成

| 專案 | 作用 |
| --- | --- |
| `Xdows-Model-Config` | 訓練路徑、模型輸出路徑、閾值和超參數設定 |
| `Xdows-Model-Maker` | 互動式訓練與樣本清洗工具，可訓練 Standard、Flash、Pro |
| `Xdows-Model-Invoker` | 託管推理庫，負責模型載入、特徵提取、ONNX 推理和閾值判定 |
| `Xdows-Model-Caller` | 命令列呼叫範例，可用 `-s`、`-f`、`-p` 選擇模型 |
| `Xdows-Model-Evaluator` | 批次評估工具，可輸出準確率、TPR、FPR、平均掃描耗時和誤判樣本 CSV |
| `Xdows-Model-Native` | C ABI 原生封裝，供 Xdows Security 主程式在驅動防護路徑中直接呼叫 |

## 推理流程

1. 選擇模型模式並載入對應 ONNX 檔案。
2. 檢查目標檔案是否存在。
3. Standard 模式要求檔案滿足 PE 標頭校驗；Flash 和 Pro 按各自特徵提取器讀取檔案內容。
4. 提取與目前模型模式匹配的 `Features` 張量。
5. 呼叫 ONNX Runtime 讀取 `Probability.output`。
6. 按 `TrainingConfig` 中的模式閾值輸出安全或惡意判定。

預設模型發現順序為執行目錄、組件嵌入資源、組件所在目錄。生產整合時應確保三個 `.onnx` 檔案與 ONNX Runtime 原生相依項一同發佈。

## 命令列呼叫

```powershell
Xdows-Model-Caller.exe <檔案路徑> [-s] [-f] [-p]
```

參數互斥：

- `-s`：使用 Standard 模型。
- `-f`：使用 Flash 模型。
- `-p`：使用 Pro 模型。

不傳模型參數時預設使用 Standard。

## C# 接入

```csharp
using Xdows_Model_Config;
using Xdows_Model_Invoker;

ModelInvoker.ConfigureThresholds(new TrainingConfig());
ModelInvoker.InitializePro();

var (isVirus, probability) = ModelInvoker.ScanFile(@"C:\Samples\app.exe");

ModelInvoker.UnloadModel();
```

Standard 使用 `Initialize()`，Flash 使用 `InitializeFlash()`，Pro 使用 `InitializePro()`。也可以向初始化方法傳入自訂 ONNX 路徑。

## 訓練與評估

`Xdows-Model-Maker` 是互動式訓練工具。預設樣本目錄來自 `TrainingConfig`：

- 黑樣本：`D:\Code\Model\Files\Black`
- 白樣本：`D:\Code\Model\Files\White`

訓練選單可選擇 Standard、Flash、Pro 中的一個或多個模型。Pro 訓練會從 `ProExpansionStartBytesPerSection` 開始，按 `ProExpansionFactor` 擴展 raw 位元組視窗，直到達到 `ProExpansionMaxBytesPerSection`、AUC 增益低於閾值或超過耐心步數。

批次評估範例：

```powershell
dotnet run --project D:\Code\Xdows-Model\Xdows-Model-Evaluator -- --mode all --limit 700 --csv hard-cases.csv
```

常用參數：

- `--mode all|standard|flash|pro`
- `--black <folder>`
- `--white <folder>`
- `--limit <n>`
- `--csv <path>`
- `--standard-model <path>`
- `--flash-model <path>`
- `--pro-model <path>`

## 與 Xdows Security 的關係

Xdows Security 主程式不在驅動裡執行 .NET 模型，也不透過驅動啟動命令列掃描器。驅動防護路徑由主程式載入 `Xdows-Model-Native.dll`，再由原生執行階段呼叫 ONNX Runtime 完成本機推理。

發佈 Xdows Security 時，應用輸出應包含：

- `Xdows-Model.onnx`
- `Xdows-Model-Flash.onnx`
- `Xdows-Model-Pro.onnx`
- `Xdows-Model-Native.dll`
- `onnxruntime.dll`
- `onnxruntime_providers_shared.dll`

## 注意事項

- 不要提交真實惡意樣本到倉庫。
- 更新 Pro 訓練或推理時，不要把 Pro 特徵長度寫死為某個固定值。
- 閾值是業務策略，不是模型本身的一部分；發佈前應使用目標樣本集重新評估。
- 原生執行階段和託管 Invoker 應保持同一套模型檔案、特徵契約和閾值設定。
