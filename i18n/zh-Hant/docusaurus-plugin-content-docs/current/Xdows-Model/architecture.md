---
title: 架構說明
description: Xdows Model 四種模式的關係、五分支 Pro Stacking 集成架構、Adaptive 分級路由流程、manifest 驅動的部署契約和特徵契約。
---

# 架構說明 {#Architecture}

本文詳解 Xdows Model 的模式架構、特徵契約和推理路徑，便於整合方和貢獻者理解內部工作方式。如果只需要使用模型，[快速開始](./get-started) 已足夠。

## 模式關係 {#Modes}

```text
┌────────────────────────────────────────────────────────────┐
│                    Xdows Model 推理模式                      │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Standard   │     Flash    │     Pro      │   Adaptive    │
│  單 GBDT 模型 │  單 GBDT 模型 │ 5 分支集成   │  分級路由     │
│   299 維     │    68 維     │   5143 維    │ Flash→Std→Pro │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

Standard、Flash、Pro 是三種獨立的判定路徑；Adaptive 不引入新模型，而是按風險等級逐級串聯三者。

## Pro Stacking 集成 {#ProStacking}

Pro 模式不是單一模型，而是 **5 分支 Stacking 集成**，結構如下：

```text
PE 檔案
   │
   ├──► Standard 分支      ──► p_std    ──┐
   ├──► Flash 分支         ──► p_flash  ──┤
   ├──► RawStat 分支       ──► p_raw    ──┼──► Fusion（邏輯迴歸）──► 最終機率
   ├──► Structural 分支    ──► p_struct ──┤
   └──► ImportBehavior 分支 ──► p_import ──┘
```

| 分支 | 維度 | 內容 |
| --- | --- | --- |
| Standard | 299 | 完整 PE/位元組統計特徵（與 Standard 模式共用契約） |
| Flash | 68 | 頭尾區域特徵（與 Flash 模式共用契約） |
| RawStat | 120 | 3 段 × 40 維的固定原始位元組統計 |
| Structural | 32 | PE 結構特徵 |
| ImportBehavior | 4624 | 匯入行為雜湊特徵（DLL 雜湊 512 + API 雜湊 4096 + 16 項統計） |
| **合計** | **5143** | 送入五個分支的混合特徵向量 |

五個分支各自輸出一個 OOF（Out-of-Fold）機率，組成 5 維向量送入 **Fusion 模型**（邏輯迴歸），輸出最終機率。

因為特徵佈局只允許**追加**，ImportBehavior 段被加在向量末端，所有早於它的偏移都保持不變。這正是舊版四分支模型仍能載入的原因：舊佈局恰好是目前 5143 維的前 519 維。

### ImportBehavior 特徵 {#ImportBehavior}

4624 維的 ImportBehavior 段來自 PE 匯入表（包含延遲載入匯入表），由三部分組成：

| 範圍 | 長度 | 內容 |
| --- | --- | --- |
| `[0, 512)` | 512 | DLL 名稱雜湊桶 |
| `[512, 4608)` | 4096 | API 名稱雜湊桶 |
| `[4608, 4624)` | 16 | 匯入表統計 |

- 雜湊使用 **FNV-1a 32 位**，種子為 `2166136261`；名稱經雜湊對應到某個桶後，該桶被設為 `1.0`（指示位，而非計數器）。
- DLL 名稱以 `Trim()` + `ToLowerInvariant()` 正規化；API 名稱只做 `Trim()`，因為 PE 匯出/匯入名稱區分大小寫。序號匯入使用合成鍵 `dll!#<ordinal>`。
- 16 項統計涵蓋解析狀態、匯入目錄是否存在及其大小、DLL/API 數量、延遲載入數量、序號與具名 API 比例、桶佔用率、重複 DLL 比例和延遲載入是否存在。

雜湊演算法、種子和兩個桶維度都是 `ImportHashConfig` 中的編譯期常數，並在模型 manifest 中重複記錄；變更其中任一項都需遞增 `FeatureSchema.Version` 並重新訓練。

### 模型檔案 {#ProFiles}

完整的 Pro 部署需要 6 個 ONNX 檔案加上一份 manifest：

| 檔案 | 用途 |
| --- | --- |
| `Xdows-Model-Pro.onnx` | Fusion 融合模型 |
| `Xdows-Model-Pro-Standard.onnx` | Standard 分支 |
| `Xdows-Model-Pro-Flash.onnx` | Flash 分支 |
| `Xdows-Model-Pro-RawStat.onnx` | RawStat 分支 |
| `Xdows-Model-Pro-Structural.onnx` | Structural 分支 |
| `Xdows-Model-Pro-ImportBehavior.onnx` | ImportBehavior 分支 |
| `Xdows-Model-Pro.manifest.json` | 特徵佈局、分支表、雜湊設定和閾值 |

Invoker 在載入 Pro 時會讀取 Fusion 模型的輸入維度：

- 若維度為 **5**，則啟用五分支集成路徑，驗證 `Xdows-Model-Pro.manifest.json`，並按 manifest 宣告的順序載入五個分支模型；
- 若維度為 **4**，則走舊版四分支路徑，不需 manifest，載入 `-Standard`、`-Flash`、`-RawStat`、`-Structural`；
- 若維度為 **5143**（或舊版 **519**），則走單模型路徑，直接把混合特徵送入 Fusion 模型本身。

對於**沒有** manifest 的五輸入 Fusion 模型，Invoker 會直接拒絕，而不是猜測，因此部分部署的模型集會明確失敗，而不是以錯誤的特徵佈局默默評分。

### 模型 Manifest {#Manifest}

`Xdows-Model-Pro.manifest.json` 由訓練器隨 ONNX 檔案一同產生，並在載入時由 Invoker 驗證。它記錄：

| 欄位 | 意義 |
| --- | --- |
| `SchemaVersion` | manifest 結構版本（目前為 `1`） |
| `ModelVersion` / `FeatureSchemaVersion` | 模型版本及對應的 `FeatureSchema.Version` |
| `FeatureCount` / `FeatureHash` | 混合維度（`5143`）和 FNV-1a 32 位佈局指紋 |
| `FusionModelFileName` / `FusionInputCount` | Fusion 檔名和預期的分支數（`5`） |
| `Branches[]` | 每個分支的 `Name`、`FileName`、`InputDimension`、`FeatureOffset`、`FeatureCount` |
| `HashAlgorithm` / `HashSeed` / `DllHashDimensions` / `ApiHashDimensions` | 必須與 `ImportHashConfig` 一致的匯入雜湊設定 |
| `Threshold` / `RecommendedThreshold` | 隨模型記錄的固定閾值和建議閾值 |

固定閾值和建議閾值都必須是 `0..100` 內的有限值。驗證涵蓋結構版本、特徵結構版本、佈局指紋、雜湊設定、Fusion 檔名、Fusion 輸入數量、混合維度、每個分支的維度/偏移，以及每個分支檔案是否存在。佈局指紋的計算方式是：以 `schema={Version}` 串接每個分支的一段 `|{branch}:{offset}:{count}`，再加上雜湊設定，最後以 `HashSeed` 為種子對該字串做 FNV-1a 32 位雜湊。

## Adaptive 分級路由 {#Adaptive}

Adaptive 模式按 **Flash → Standard → Pro** 的順序逐級升級：

```text
PE 檔案
   │
   ▼
 Flash 判定 ──► p ≤ 100 − FlashThreshold ?  ── 是 ──► 放行（Flash 結論）
                │
                否
                ▼
 Standard 判定 ──► p ≤ 100 − StandardThreshold ? ── 是 ──► 放行（Standard 結論）
                │
                否
                ▼
 Pro 判定 ──► p ≥ ProThreshold ?  ── 是 ──► 判毒（Pro 結論）
                                   否 ──► 放行（Pro 結論）
```

### 升級判定 {#AdaptivePolicy}

`AdaptiveDecisionPolicy.EvaluateIntermediate` 使用對稱閾值：

- 當 `probability ≤ 100 − threshold` 時，判定為 **FinalSafe**，不再升級；
- 否則 **Escalate** 到下一級。

這意味著只有處於「中間灰區」的檔案才會被升級，絕大多數安全檔案在 Flash 階段就完成判定。Flash 和 Standard 這兩個中間階段只使用固定閾值，永不產生陽性判定——三檔判定只在最終的 Pro 階段套用一次。

### 資源開銷 {#AdaptiveCost}

| 模式 | ONNX 工作階段數 | 單檔案耗時 |
| --- | --- | --- |
| Flash | 1 | 最低 |
| Standard | 1 | 中等 |
| Pro（5 分支 Stacking） | 6（1 Fusion + 5 分支） | 最高 |
| Pro（舊版 4 分支 Stacking） | 5（1 Fusion + 4 分支） | 最高 |
| Pro（單模型） | 1 | 中等 |
| Adaptive（Stacking） | 8（1 Flash + 1 Standard + 1 Fusion + 5 分支） | 接近 Flash |
| Adaptive（單模型） | 3（1 Flash + 1 Standard + 1 Pro） | 接近 Flash |

Adaptive 常駐多個工作階段，但執行時絕大多數檔案只走 Flash，因此平均耗時接近 Flash 模式。

## 特徵契約 {#FeatureSchema}

所有特徵維度由 `Xdows-Model-Config` 中的 `FeatureSchema` 靜態常數類別約束：

```csharp
public static class FeatureSchema
{
    public const int Version = 3;
    public const int StandardFeatureCount = 299;
    public const int FlashFeatureCount = 68;
    public const int ProHybridFeatureCount = 5143;
    public const int ProRawStatCount = 120;
    public const int ProStructuralCount = 32;
    public const int ProImportBehaviorCount = 4624; // DllHash 512 + ApiHash 4096 + Stats 16
    public const int ProFusionFeatureCount = 5;
    public const int ProImportStatsCount = 16;

    public const int ProStandardOffset = 0;
    public const int ProFlashOffset = 299;         // ProStandardOffset + StandardFeatureCount
    public const int ProRawStatOffset = 367;       // ProFlashOffset + FlashFeatureCount
    public const int ProStructuralOffset = 487;    // ProRawStatOffset + ProRawStatCount
    public const int ProImportBehaviorOffset = 519; // ProStructuralOffset + ProStructuralCount

    // Legacy (Schema v2) layout, kept so old four-branch models still load.
    public const int ProLegacyHybridFeatureCount = 519;
    public const int ProLegacyFusionFeatureCount = 4;
}
```

`Version = 3` 表示目前特徵契約是第 3 版。修改任何 `FeatureCount` 常數都會讓舊 ONNX 模型不相容，必須同步重新訓練所有受影響的模式。

### Pro 特徵佈局 {#ProLayout}

Pro 的 5143 維混合特徵向量佈局如下：

| 偏移 | 長度 | 內容 |
| --- | --- | --- |
| 0 | 299 | Standard 特徵 |
| 299 | 68 | Flash 特徵 |
| 367 | 120 | RawStat 特徵（3 段 × 40） |
| 487 | 32 | Structural 特徵 |
| 519 | 4624 | ImportBehavior 特徵（512 DLL 雜湊 + 4096 API 雜湊 + 16 項統計） |
| **519 + 4624** | **5143** | **總長度** |

五個分支從混合向量中按偏移切出自己的子向量，分別推理得到 OOF 機率，再交給 Fusion 模型。混合向量中的分支順序恰好就是 Fusion 輸入中的分支順序。

## 推理流程 {#Inference}

無論哪種模式，單次推理都遵循以下步驟：

1. 檢查目標檔案是否存在；
2. 驗證 PE 頭（所有模式均通過 `FeatureExtractor.IsPeFile` 驗證，不通過則擲回 `NotSupportedException`）；
3. 按目前模式提取 `Features` 張量；
4. 呼叫 ONNX Runtime 讀取 `Probability.output`；
5. 按 `TrainingConfig` 中的模式閾值輸出安全或惡意判定。

Pro 模式在第 3 步會切出 5 個子向量分別推理，第 4 步對 Fusion 模型推理。Adaptive 模式會按路由流程多次執行步驟 3–5。

## 三檔判定 {#Verdict}

全部三種實作——託管 Invoker、原生執行階段和 Rust Invoker——共用同一套三檔判定，並以穩定的整數值對外呈現：

| 判定 | ABI 值 | 條件 |
| --- | --- | --- |
| `Clean` | 0 | `probability` 低於建議閾值 |
| `Suspicious` | 1 | `probability` 達到或超過建議閾值，且低於固定閾值 |
| `Malware` | 2 | `probability` 達到或超過固定閾值 |

固定閾值永遠優先。建議閾值從模型同層的 `<model>.threshold.json` 讀取，且永遠不會覆寫固定閾值——它只定義 `Suspicious` 區段的下界。

為相容於只讀取布林值 `IsThreat` 的呼叫端，原生執行階段對 `Suspicious` 也回報 `IsThreat = 1`；偵測名稱仍只為 `Malware` 產生。

## 模型發現 {#ModelDiscovery}

模型不再內嵌於組件中。Invoker 依下列順序解析模型檔案：

1. 組件同層的 `Models` 子目錄（`ModelLayout.ModelDirectoryName`）；
2. 組件目錄本身，供 `Models` 佈局出現前建立的部署使用。

若兩個位置都沒有該檔案，載入會失敗並在錯誤中列出兩個候選路徑。生產整合時請將整個 `Models` 目錄隨應用一同發布，不要依賴舊版的組件目錄回退路徑。
