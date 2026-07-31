---
title: 訓練與評估
description: Xdows Model 的訓練工具、樣本規範、超參數設定和批次評估流程。
---

# 訓練與評估 {#Training}

本文介紹如何使用 `Xdows-Model-Maker` 訓練模型，以及如何用 `Xdows-Model-Evaluator` 做批次評估。模型架構和特徵契約見 [架構說明](./architecture)。

## 樣本規範 {#Samples}

預設樣本目錄來自 `TrainingConfig`：

- 黑樣本（惡意）：`D:\Code\Model\Files\Black`
- 白樣本（安全）：`D:\Code\Model\Files\White`

兩個目錄下的檔案均應為 PE 檔案（`.exe`、`.dll` 等）。樣本檔名不強制要求特定格式，但建議按家族或來源分類存放以便回溯。

:::caution[安全提示]
不要提交真實惡意樣本到倉庫。`Xdows-Model\tests\samples\README.md` 描述了安全樣本的存放與使用規範。訓練用的黑樣本應放在倉庫外部，並透過 `.gitignore` 排除。
:::

## 訓練工具 {#Maker}

`Xdows-Model-Maker` 是互動式命令列訓練工具，啟動後會顯示選單：

```powershell
dotnet run --project D:\Code\Xdows-Model\Xdows-Model-Maker
```

選單支援以下操作：

- 訓練 Standard 模型
- 訓練 Flash 模型
- 訓練 Pro 模型（含 4 分支 Stacking）
- 同時訓練多個模式
- 樣本清洗與統計

Pro 訓練會依次訓練四個分支模型（Standard / Flash / RawStat / Structural），再用 Out-of-Fold 機率訓練 Fusion 邏輯迴歸模型，最終輸出 5 個 ONNX 檔案。

## 超參數 {#Hyperparameters}

關鍵超參數定義在 `TrainingConfig.cs` 中，可在訓練前修改：

### 通用 {#HyperCommon}

| 參數 | 預設值 | 說明 |
| --- | --- | --- |
| `RandomSeed` | 43846 | 全域隨機種子，保證可重現 |

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
| `StandardThreshold` | 92.0 | 判毒閾值（百分比） |

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
| `FlashThreshold` | 96.0 | 判毒閾值（百分比） |

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
| `ProThreshold` | 94.0 | 判毒閾值（百分比） |

Pro 的 Fusion 模型使用邏輯迴歸，沒有獨立的 GBDT 超參數。

## 模型輸出 {#Output}

訓練完成後，模型檔案會輸出到 `TrainingConfig` 指定的路徑：

| 模式 | 輸出檔案 |
| --- | --- |
| Standard | `Xdows-Model.zip` + `Xdows-Model.onnx` |
| Flash | `Xdows-Model-Flash.zip` + `Xdows-Model-Flash.onnx` |
| Pro | `Xdows-Model-Pro.zip` + `Xdows-Model-Pro.onnx` + 4 個分支 `.onnx` |

Pro 預設輸出 4 維 Fusion 模型 + 4 個分支模型，Invoker 載入時會自動啟用 Stacking 集成路徑。若只匯出 519 維單模型（不含分支），Invoker 會走單模型降級路徑，不載入分支檔案。

## 批次評估 {#Evaluator}

`Xdows-Model-Evaluator` 對指定模式的模型在樣本集上做批次評估，輸出準確率、TPR、FPR、平均掃描耗時，可選匯出誤判樣本 CSV。

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

`tests\Invoke-NativeConsistency.ps1` 會用同一批安全 PE 樣本分別透過託管呼叫器和原生 DLL 執行掃描，比較兩者結論是否一致、機率差是否在容差內：

```powershell
& 'D:\Code\Xdows-Model\tests\Invoke-NativeConsistency.ps1' -SkipBuild
```

修改 Invoker 或 Native 任一側的特徵提取或推理邏輯後，都必須跑一遍此測試，確保兩端結論一致。
