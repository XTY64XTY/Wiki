# Xdows-Model

> 專案倉庫：<https://github.com/XTY64XTY/Xdows-Model>

Xdows-Model 是一個基於 **LightGBM** 思路構建，並使用 **ONNX Runtime** 進行推理的惡意檔案掃描模型專案。倉庫目前使用 C# 實作，按職責拆分為呼叫端、推理端與訓練端。

## 專案結構

- `Xdows-Model-Caller`
  - 最小呼叫範例（`Program.cs`），示範如何在業務程式中接入模型。
- `Xdows-Model-Invoker`
  - 推理核心函式庫，包含：
    - `ModelInvoker`：模型初始化、載入與掃描；
    - `FeatureExtractor`：檔案特徵提取與 PE 檔識別。
- `Xdows-Model-Maker`
  - 模型資料與訓練相關程式碼（例如 `DataLoader`、`ModelTrainer`、`Program`）。

## 推理流程（Invoker）

`Xdows-Model-Invoker` 的核心流程如下：

1. **模型準備**
   - 預設模型檔名為 `Xdows-Model.onnx`。
   - 會先在執行目錄查找；若不存在，嘗試從嵌入資源提取；再嘗試從組件目錄複製。
2. **檔案校驗**
   - 掃描前先確認目標檔案存在。
   - 透過 `MZ` 與 `PE` 標頭判斷是否為 PE 檔，不支援的類型會直接拒絕。
3. **特徵提取**
   - 提取 279 維特徵（`FeatureCount = 279`），包含：
     - 256 維位元組頻率；
     - 檔案大小（對數轉換）；
     - 全域熵、分塊熵統計（最小/最大/平均/方差/位置等）；
     - 可列印字元比例、控制字元比例、空白比例、字母/數字比例；
     - 0 位元組相關特徵（占比、最長連續段）等。
4. **ONNX 推理**
   - 輸入名稱為 `Features`（特徵張量）與 `Label`（布林標籤占位）。
   - 輸出讀取 `Probability.output`，並換算為百分比。
5. **判定結果**
   - 目前實作中，`probability >= 90.0f` 會判定為病毒檔案。

## 快速接入（C#）

> 以下為呼叫思路，具體命名空間請以倉庫實際程式碼為準。

```csharp
using Xdows_Model_Invoker;

// 可選：顯式初始化（不傳路徑時使用預設模型發現策略）
ModelInvoker.Initialize();

// 掃描檔案
var result = ModelInvoker.ScanFile(@"C:\\test\\sample.exe");
Console.WriteLine($"IsVirus: {result.isVirus}, Probability: {result.probability:F2}%");

// 程式結束前可釋放模型
ModelInvoker.UnloadModel();
```

## 適用場景

- 在防毒/安全工具中提供本地靜態檔案預篩；
- 在樣本分析流程中作為第一層風險評分；
- 與簽名檢測、行為檢測組合為多引擎策略。

## 注意事項

- 目前推理流程主要面向 **PE 檔案**；非 PE 檔案會被拒絕。
- `90%` 閾值是業務策略值，建議依實際樣本集校準。
- 若需穩定發佈，建議在上層補充：
  - 掃描逾時控制；
  - 模型版本管理；
  - 日誌與稽核。
