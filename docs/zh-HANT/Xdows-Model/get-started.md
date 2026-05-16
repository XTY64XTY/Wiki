# Xdows-Model

> 專案倉庫：<https://github.com/XTY64XTY/Xdows-Model>

Xdows-Model 是一個基於 **LightGBM**（透過 ML.NET 實作）訓練，並使用 **ONNX Runtime** 進行推理的惡意檔案掃描模型專案。目前版本為 **v2**，使用 C# 實作，按職責拆分為三個子專案。

## 專案結構

| 子專案 | 說明 |
|--------|------|
| `Xdows-Model-Caller` | 最小呼叫範例，示範如何在業務程式中接入模型推理 |
| `Xdows-Model-Invoker` | 推理核心函式庫，包含模型載入、特徵提取與掃描推理 |
| `Xdows-Model-Maker` | 訓練工具，包含資料載入、特徵提取、模型訓練與 ONNX 匯出 |

### Xdows-Model-Invoker

推理核心函式庫，提供以下功能：

- `ModelInvoker`：模型初始化、載入與推理，支援執行緒安全的單例模式
- `FeatureExtractor`：檔案特徵提取與 PE 檔格式識別

### Xdows-Model-Maker

訓練工具，提供以下功能：

- `DataLoader`：並行載入黑/白樣本檔案，支援非 PE 檔案自動清洗
- `FeatureExtractor`：與 Invoker 共用相同的特徵提取邏輯
- `ModelTrainer`：基於 ML.NET LightGBM 的二分類模型訓練與評估
- `TrainingConfig`：訓練超參數設定

### Xdows-Model-Caller

最小呼叫範例，展示如何透過命令列參數掃描單一檔案：

```
Xdows-Model-Caller.exe <檔案路徑>
```

## 推理流程

`Xdows-Model-Invoker` 的核心流程如下：

### 1. 模型準備

預設模型檔名為 `Xdows-Model.onnx`，按以下優先順序查找：

1. 執行目錄（`AppContext.BaseDirectory`）
2. 嵌入資源（從組件提取並寫入執行目錄）
3. 組件所在目錄（複製到執行目錄）

若均未找到，則擲回 `FileNotFoundException`。

### 2. 檔案校驗

- 確認目標檔案存在
- 透過 `MZ` 與 `PE` 標頭判斷是否為 PE 檔案，非 PE 檔案直接擲回 `NotSupportedException`

### 3. 特徵提取

提取 **279 維**特徵（`FeatureCount = 279`），具體包括：

| 特徵類別 | 維度 | 說明 |
|----------|------|------|
| 位元組頻率 | 256 | 每個位元組值（0x00–0xFF）在檔案中的出現頻率 |
| 檔案大小 | 1 | 對數轉換 `log(fileSize + 1)` |
| 全域熵 | 1 | 整個檔案的 Shannon 熵 |
| 分塊熵統計 | 8 | 最小/最大/平均/方差、最小/最大熵塊位置、首/末塊熵 |
| 位元組分佈 | 5 | 唯一位元組數、最常見位元組及其占比、最不常見位元組及其占比 |
| 字元比例 | 5 | 可列印字元、控制字元、空白字元、字母、數字 |
| 零位元組特徵 | 2 | 零位元組占比、最長零位元組連續段 |
| 高位元組比例 | 1 | 0x80–0xFF 位元組占比 |

### 4. ONNX 推理

- 輸入：`Features`（1×279 特徵張量）與 `Label`（布林標籤占位）
- 輸出：讀取 `Probability.output`，乘以 100 換算為百分比

### 5. 判定結果

當 `probability >= 90.0f` 時判定為惡意檔案。

## 快速接入（C#）

```csharp
using Xdows_Model_Invoker;

// 初始化模型（不傳路徑時使用預設模型發現策略）
ModelInvoker.Initialize();

// 掃描檔案
var (isVirus, probability) = ModelInvoker.ScanFile(@"C:\test\sample.exe");
Console.WriteLine($"IsVirus: {isVirus}, Probability: {probability:F2}%");

// 釋放模型資源
ModelInvoker.UnloadModel();
```

也可以在掃描時指定模型路徑：

```csharp
var (isVirus, probability) = ModelInvoker.ScanFile(@"C:\test\sample.exe", @"C:\models\Xdows-Model.onnx");
```

## 訓練流程

使用 `Xdows-Model-Maker` 訓練模型：

1. **準備樣本**：將黑樣本放入 `Black` 目錄，白樣本放入 `White` 目錄
2. **清洗資料**：執行 Maker 選擇「清洗非PE檔案」，自動刪除非 PE 格式的樣本
3. **訓練模型**：選擇「訓練模型」，程式將自動完成以下步驟：
   - 並行載入所有樣本並提取特徵
   - 按 80/20 比例劃分訓練集與測試集
   - 訓練 LightGBM 二分類模型
   - 輸出評估指標（準確率、AUC、AUPRC、F1 分數、混淆矩陣）
   - 儲存 ML.NET 模型（`.zip`）與 ONNX 模型（`.onnx`）

### 訓練設定

| 參數 | 預設值 | 說明 |
|------|--------|------|
| LearningRate | 0.1 | 學習率 |
| NumberOfLeaves | 31 | 葉節點數 |
| MinimumExampleCountPerLeaf | 20 | 葉節點最小樣本數 |
| NumberOfIterations | 400 | 迭代次數 |
| RandomSeed | 42 | 隨機種子 |

## 依賴

- **.NET 10.0**
- [Microsoft.ML](https://www.nuget.org/packages/Microsoft.ML/) 5.0.0
- [Microsoft.ML.OnnxRuntime](https://www.nuget.org/packages/Microsoft.ML.OnnxRuntime/) 1.26.0
- [Microsoft.ML.LightGBM](https://www.nuget.org/packages/Microsoft.ML.LightGBM/) 5.0.0（僅 Maker）

## 適用場景

- 在防毒/安全工具中提供本地靜態檔案預篩
- 在樣本分析流程中作為第一層風險評分
- 與簽名檢測、行為檢測組合為多引擎策略

## 注意事項

- 目前推理流程僅支援 **PE 檔案**，非 PE 檔案會被拒絕
- `90%` 閾值是業務策略值，建議依實際樣本集校準
- 生產環境建議補充：掃描逾時控制、模型版本管理、日誌與稽核
- 專案基於 MIT 協議開源
