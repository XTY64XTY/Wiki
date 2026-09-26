---
title: 訓練與評估
description: Xdows Model 的訓練工具、樣本規範、資料集切分、超參數設定、建議閾值校準和批次評估流程。
---

# 訓練與評估 {#Training}

本文介紹如何使用 `Xdows-Model-Maker` 訓練模型，以及如何用 `Xdows-Model-Evaluator` 做批次評估。模型架構和特徵契約見 [架構說明](./architecture)。

## 樣本規範 {#Samples}

預設樣本目錄來自 `TrainingConfig`：

- 黑樣本（惡意）：`D:\Code\Model\Files\Black`
- 白樣本（安全）：`D:\Code\Model\Files\White`

兩個目錄下的檔案均應為 PE 檔案（`.exe`、`.dll` 等）。樣本檔名不強制要求特定格式，但建議按家族或來源分類存放以便回溯。

訓練 Pro 時，每個樣本還可以額外攜帶三個選用的中繼資料欄位，讓評估結果更誠實：

| 欄位 | 用途 |
| --- | --- |
| `GroupKey` | 惡意家族或活動識別碼。共用同一 `GroupKey` 的樣本會被保留在切分的同一側，避免近似重複樣本從測試集洩漏到訓練集。 |
| `TimeKey` | 樣本蒐集時間。當 `ProSplitMode` 為 `TimeOrdered` 時必須提供。 |
| `ContentHash` | 檔案內容的 SHA-256，由切分器計算用於去重。 |

:::caution[安全提示]
不要提交真實惡意樣本到倉庫。`Xdows-Model\tests\samples\README.md` 描述了安全樣本的存放與使用規範。訓練用的黑樣本應放在倉庫外部，並透過 `.gitignore` 排除。
:::

## 訓練工具 {#Maker}

`Xdows-Model-Maker` 是互動式選單工具：

```powershell
dotnet run --project D:\Code\Xdows-Model\Xdows-Model-Maker
```

選單提供模式勾選項以及以下操作：

- 開始訓練（依次訓練每一個勾選的模式）
- 開始樣本清洗與統計
- **複製產物到 Invoker** — 將剛訓練出的 ONNX 檔案、Pro manifest 和建議閾值 manifest 複製到 `Xdows-Model-Invoker\Models\`，讓 Invoker 無需手動複製即可取用
- 結束

Pro 訓練會依次訓練五個分支模型（Standard / Flash / RawStat / Structural / ImportBehavior），使用其 Out-of-Fold 機率訓練 Fusion 邏輯迴歸模型，最終輸出 6 個 ONNX 檔案加上 `Xdows-Model-Pro.manifest.json`。產物清單由 `ProBranches` 和 `ProModelManifest` 推導而非寫死，因此新加入的分支不會在複製步驟中被默默遺漏。

### 資料集切分 {#Splitter}

Pro 使用 `ProDatasetSplitter`，而非單純的隨機切分：

1. **內容雜湊去重**（`ProDeduplicateByContentHash`，預設開啟）先移除位元組完全相同的樣本。否則重複樣本會同時落在訓練集和測試集，虛報指標。
2. **分組隔離**（`ProEnforceGroupIsolation`，預設開啟）讓共用同一 `GroupKey` 的每個樣本完全落在同一側。沒有 `GroupKey` 的樣本會退化為每個樣本一組，且切分報告會明確指出分組隔離未生效。
3. **切分策略**（`ProSplitMode`）：`StratifiedRandom`（預設）在兩半中維持類別比例；`TimeOrdered` 按 `TimeKey` 排序，把最新的一段放入測試集，並在樣本缺少 `TimeKey` 時明確失敗，而不是默默降級。
4. **報告**：切分器會印出兩半的類別分佈以及去重和隔離的統計。

外層測試集比例為 `ProTestFraction`（預設 `0.2`），必須嚴格介於 0 與 1 之間。

## 超參數 {#Hyperparameters}

關鍵超參數定義在 `TrainingConfig.cs` 中，可在訓練前修改：

### 通用 {#HyperCommon}

| 參數 | 預設值 | 說明 |
| --- | --- | --- |
| `RandomSeed` | 43846 | 全域隨機種子，保證可重現 |
| `FalsePositiveCostRatio` | 2.65 | 一個誤報相當於幾個漏報；同時驅動閾值選擇和樣本加權 |
| `UseCostSensitiveThreshold` | `true` | 自動校準建議閾值，而非直接使用固定閾值 |
| `UseCostSensitiveTrainingWeight` | `true` | 將誤報成本傳遞到 LightGBM 的正類別權重 |

### Standard {#HyperStandard}

| 參數 | 預設值 | 說明 |
| --- | --- | --- |
| `LearningRate` | 0.025 | 學習率 |
| `NumberOfLeaves` | 127 | 葉子數 |
| `MinimumExampleCountPerLeaf` | 16 | 葉節點最小樣本數 |
| `NumberOfIterations` | 1400 | 迭代次數 |
| `StandardL1Regularization` | 0.02 | L1 正規化 |
| `StandardL2Regularization` | 0.4 | L2 正規化 |
| `StandardMaximumTreeDepth` | 10 | 最大樹深度 |
| `StandardFeatureFraction` | 0.9 | 特徵取樣比例 |
| `StandardSubsampleFraction` | 0.85 | 樣本取樣比例 |
| `StandardTargetFalsePositiveRate` | 0.005 | 閾值校準目標 FPR |
| `StandardThreshold` | 92.0 | 固定判毒閾值（百分比） |

### Flash {#HyperFlash}

| 參數 | 預設值 | 說明 |
| --- | --- | --- |
| `FlashLearningRate` | 0.1 | 學習率 |
| `FlashNumberOfLeaves` | 31 | 葉子數 |
| `FlashMinimumExampleCountPerLeaf` | 8 | 葉節點最小樣本數 |
| `FlashNumberOfIterations` | 800 | 迭代次數 |
| `FlashL1Regularization` | 0.01 | L1 正規化 |
| `FlashL2Regularization` | 0.2 | L2 正規化 |
| `FlashMaximumTreeDepth` | 5 | 最大樹深度 |
| `FlashThreshold` | 96.0 | 固定判毒閾值（百分比） |

### Pro {#HyperPro}

| 參數 | 預設值 | 說明 |
| --- | --- | --- |
| `ProLearningRate` | 0.01 | 分支學習率 |
| `ProNumberOfLeaves` | 63 | 葉子數 |
| `ProMinimumExampleCountPerLeaf` | 10 | 葉節點最小樣本數 |
| `ProNumberOfIterations` | 1200 | 分支迭代次數 |
| `ProL1Regularization` | 0.01 | L1 正規化 |
| `ProL2Regularization` | 0.1 | L2 正規化 |
| `ProMaximumTreeDepth` | 8 | 最大樹深度 |
| `ProFeatureFraction` | 0.85 | 特徵取樣比例 |
| `ProSubsampleFraction` | 0.8 | 樣本取樣比例 |
| `ProMaxParallelBranches` | 4 | 分支並行度上限 |
| `ProTestFraction` | 0.2 | 外層測試集比例 |
| `ProSplitMode` | `StratifiedRandom` | `StratifiedRandom` 或 `TimeOrdered` |
| `ProThreshold` | 94.0 | 固定判毒閾值（百分比） |

Pro 的 Fusion 模型使用邏輯迴歸，沒有獨立的 GBDT 超參數。

## 建議閾值校準 {#RecommendedThreshold}

每個模式都會隨 ONNX 檔案一同發布一個建議閾值：

- Standard → `Xdows-Model.threshold.json`
- Flash → `Xdows-Model-Flash.threshold.json`
- Pro → `Xdows-Model-Pro.threshold.json`，並同步寫入 `Xdows-Model-Pro.manifest.json`

該值在訓練時以成本敏感目標選擇（一個誤報按 `FalsePositiveCostRatio` 個漏報計費），並連同選擇方法一併記錄。它定義 `Suspicious` 區段的下界，且永遠不會覆寫 `TrainingConfig` 中的固定閾值。只有在 `UseCostSensitiveThreshold` 開啟時，manifest 才會同時寫在 ML.NET 模型和匯出的 ONNX 檔案旁。

## 模型輸出 {#Output}

訓練完成後，模型檔案會輸出到 `TrainingConfig` 指定的路徑：

| 模式 | 輸出檔案 |
| --- | --- |
| Standard | `Xdows-Model.zip` + `Xdows-Model.onnx` + `Xdows-Model.threshold.json` |
| Flash | `Xdows-Model-Flash.zip` + `Xdows-Model-Flash.onnx` + `Xdows-Model-Flash.threshold.json` |
| Pro | `Xdows-Model-Pro.zip` + `Xdows-Model-Pro.onnx` + 5 個分支 `.onnx` 檔案（`-Standard`、`-Flash`、`-RawStat`、`-Structural`、`-ImportBehavior`）+ `Xdows-Model-Pro.manifest.json` + `Xdows-Model-Pro.threshold.json` |

Pro 預設輸出 5 輸入 Fusion 模型加 5 個分支模型，Invoker 驗證 manifest 後會啟用五分支 Stacking 路徑。舊版四分支模型（4 輸入 Fusion、519 維混合輸入、無 manifest）仍可透過相容路徑載入；5143 維且不含分支的單模型則走單模型降級路徑。

使用 Maker 選單中的 **複製產物到 Invoker** 將整套檔案放入 `Xdows-Model-Invoker\Models\`。Pro 模型、其五個分支模型和其 manifest 必須一同部署——缺少 manifest 的五輸入 Fusion 模型會被 Invoker 拒絕。

## 批次評估 {#Evaluator}

`Xdows-Model-Evaluator` 對指定模式的模型在樣本集上做批次評估，輸出準確率、TPR、FPR 和平均掃描耗時，可選匯出誤判樣本 CSV。

```powershell
dotnet run --project D:\Code\Xdows-Model\Xdows-Model-Evaluator -- --mode all --limit 700 --csv hard-cases.csv
```

### 參數 {#EvaluatorOptions}

| 參數 | 說明 | 預設值 |
| --- | --- | --- |
| `--mode <all\|standard\|flash\|pro>` | 評估模式 | `all` |
| `--black <folder>` | 黑樣本目錄 | `TrainingConfig.BlackFolder` |
| `--white <folder>` | 白樣本目錄 | `TrainingConfig.WhiteFolder` |
| `--limit <n>` | 每類抽樣數量 | 全量 |
| `--seed <n>` | 抽樣種子 | 42 |
| `--csv <path>` | 只匯出 FP/FN/失敗樣本 | 不匯出 |
| `--standard-model <path>` | Standard ONNX 路徑 | 預設路徑 |
| `--flash-model <path>` | Flash ONNX 路徑 | 預設路徑 |
| `--pro-model <path>` | Pro ONNX 路徑 | 預設路徑 |

### 輸出指標 {#Metrics}

每個模式會輸出以下指標：

- **Accuracy**：準確率 = (TP + TN) / 總數
- **TPR**：真正例率（召回率）= TP / (TP + FN)
- **FPR**：假正例率（誤報率）= FP / (FP + TN)
- **F1**：F1 分數 = 2 × TP / (2 × TP + FP + FN)
- **AUC**：ROC 曲線下面積（條件輸出）
- **AUPRC**：PR 曲線下面積（條件輸出）
- **平均掃描耗時**：單檔案平均推理時間
- **失敗數**：因 PE 驗證失敗、檔案讀取錯誤等無法評估的樣本數

CSV 匯出包含 `mode,path,label,prediction,probability,error` 欄位，只記錄 FP、FN 和失敗樣本，用於排查 hard case。

## 原生一致性測試 {#NativeConsistency}

`tests\Invoke-NativeConsistency.ps1` 會用同一批安全 PE 樣本，分別透過託管呼叫器和原生 DLL 對 Standard、Flash、Pro 和 Adaptive 執行掃描：

```powershell
& 'D:\Code\Xdows-Model\tests\Invoke-NativeConsistency.ps1' -SkipBuild
```

兩側必須對三檔判定（`Clean` / `Suspicious` / `Malware`）和威脅判定給出一致結論，且機率差必須維持在設定的容差內。由於判定依賴建議閾值，指令碼也會斷言所需的模型檔案齊備——五個 Pro 分支模型、`Xdows-Model-Pro.manifest.json` 和三份 `*.threshold.json` manifest。

修改 Invoker 或 Native 任一側的特徵提取或推理邏輯後，都必須跑一遍此測試，確保兩端結論一致。
