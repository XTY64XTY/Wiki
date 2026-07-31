---
title: 架構說明
description: Xdows Model 四種模式的關係、Pro Stacking 集成架構、Adaptive 分級路由流程和特徵契約。
---

# 架構說明 {#Architecture}

本文詳解 Xdows Model 的模式架構、特徵契約和推理路徑，便於整合方和貢獻者理解內部工作方式。如果只需要使用模型，[快速開始](./get-started) 已足夠。

## 模式關係 {#Modes}

```text
┌────────────────────────────────────────────────────────────┐
│                    Xdows Model 推理模式                     │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Standard   │     Flash    │     Pro      │   Adaptive    │
│  单 GBDT 模型 │  单 GBDT 模型 │ 4 分支集成   │  分级路由     │
│   299 维     │    68 维     │   519 维     │ Flash→Std→Pro │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

Standard、Flash、Pro 是三種獨立的判定路徑；Adaptive 不引入新模型，而是按風險等級逐級串聯三者。

## Pro Stacking 集成 {#ProStacking}

Pro 模式不是單一模型，而是 **4 分支 Stacking 集成**，結構如下：

```text
PE 文件
   │
   ├──► Standard 分支 ──► p_std   ──┐
   ├──► Flash 分支    ──► p_flash ──┤
   ├──► RawStat 分支  ──► p_raw   ──┼──► Fusion（逻辑回归）──► 最终概率
   └──► Structural 分支 ──► p_struct ─┘
```

| 分支 | 維度 | 內容 |
| --- | --- | --- |
| Standard | 299 | 完整 PE/位元組統計特徵（與 Standard 模式共用契約） |
| Flash | 68 | 頭尾區域特徵（與 Flash 模式共用契約） |
| RawStat | 120 | 3 段 × 40 維的固定原始位元組統計 |
| Structural | 32 | PE 結構特徵 |
| **合計** | **519** | 送入四個分支的混合特徵向量 |

四個分支各自輸出一個 OOF（Out-of-Fold）機率，組成 4 維向量送入 **Fusion 模型**（邏輯迴歸），輸出最終機率。

### 模型檔案 {#ProFiles}

完整的 Pro 部署需要 5 個 ONNX 檔案：

| 檔案 | 維度 | 角色 |
| --- | --- | --- |
| `Xdows-Model-Pro.onnx` | 4 | Fusion 融合模型 |
| `Xdows-Model-Pro-Standard.onnx` | 299 | Standard 分支 |
| `Xdows-Model-Pro-Flash.onnx` | 68 | Flash 分支 |
| `Xdows-Model-Pro-RawStat.onnx` | 120 | RawStat 分支 |
| `Xdows-Model-Pro-Structural.onnx` | 32 | Structural 分支 |

Invoker 在載入 Pro 時會讀取 Fusion 模型的輸入維度：

- 若維度為 **4**，則啟用 Stacking 集成路徑，載入四個分支模型；
- 若維度為 **519**，則走單模型路徑，直接把混合特徵送入 Fusion 模型本身。

這一設計讓 Pro 既能以集成形式獲得最高準確率，也能在僅發布 519 維單模型時降級為單模型推理。

## Adaptive 分級路由 {#Adaptive}

Adaptive 模式按 **Flash → Standard → Pro** 的順序逐級升級：

```text
PE 文件
   │
   ▼
 Flash 判定 ──► p ≤ 100 − FlashThreshold ?  ── 是 ──► 放行（Flash 结论）
                │
                否
                ▼
 Standard 判定 ──► p ≤ 100 − StandardThreshold ? ── 是 ──► 放行（Standard 结论）
                │
                否
                ▼
 Pro 判定 ──► p ≥ ProThreshold ?  ── 是 ──► 判毒（Pro 结论）
                                   否 ──► 放行（Pro 结论）
```

### 升級判定 {#AdaptivePolicy}

`AdaptiveDecisionPolicy.EvaluateIntermediate` 使用對稱閾值：

- 當 `probability ≤ 100 − threshold` 時，判定為 **FinalSafe**，不再升級；
- 否則 **Escalate** 到下一級。

這意味著只有處於「中間灰區」的檔案才會被升級，絕大多數安全檔案在 Flash 階段就完成判定。

### 資源開銷 {#AdaptiveCost}

| 模式 | ONNX 工作階段數 | 單檔案耗時 |
| --- | --- | --- |
| Flash | 1 | 最低 |
| Standard | 1 | 中等 |
| Pro（Stacking） | 5（1 Fusion + 4 分支） | 最高 |
| Pro（單模型） | 1 | 中等 |
| Adaptive（Stacking） | 7（1 Flash + 1 Standard + 1 Fusion + 4 分支） | 接近 Flash |
| Adaptive（單模型） | 3（1 Flash + 1 Standard + 1 Pro） | 接近 Flash |

Adaptive 常駐多個工作階段，但執行時絕大多數檔案只走 Flash，因此平均耗時接近 Flash 模式。

## 特徵契約 {#FeatureSchema}

所有特徵維度由 `Xdows-Model-Config` 中的 `FeatureSchema` 靜態常數類別約束：

```csharp
public static class FeatureSchema
{
    public const int Version = 2;
    public const int StandardFeatureCount = 299;
    public const int FlashFeatureCount = 68;
    public const int ProHybridFeatureCount = 519;
    public const int ProRawStatCount = 120;
    public const int ProStructuralCount = 32;
    public const int ProFusionFeatureCount = 4;

    public const int ProStandardOffset = 0;
    public const int ProFlashOffset = 299;      // ProStandardOffset + StandardFeatureCount
    public const int ProRawStatOffset = 367;    // ProFlashOffset + FlashFeatureCount
    public const int ProStructuralOffset = 487; // ProRawStatOffset + ProRawStatCount
}
```

`Version = 2` 表示目前特徵契約是第 2 版。修改任何 `FeatureCount` 常數都會讓舊 ONNX 模型不相容，必須同步重新訓練所有受影響的模式。

### Pro 特徵佈局 {#ProLayout}

Pro 的 519 維混合特徵向量佈局如下：

| 偏移 | 長度 | 內容 |
| --- | --- | --- |
| 0 | 299 | Standard 特徵 |
| 299 | 68 | Flash 特徵 |
| 367 | 120 | RawStat 特徵（3 段 × 40） |
| 487 | 32 | Structural 特徵 |
| **487 + 32** | **519** | **總長度** |

四個分支從混合向量中按偏移切出自己的子向量，分別推理得到 OOF 機率，再交給 Fusion 模型。

## 推理流程 {#Inference}

無論哪種模式，單次推理都遵循以下步驟：

1. 檢查目標檔案是否存在；
2. 驗證 PE 頭（所有模式均通過 `FeatureExtractor.IsPeFile` 驗證，不通過則擲回 `NotSupportedException`）；
3. 按目前模式提取 `Features` 張量；
4. 呼叫 ONNX Runtime 讀取 `Probability.output`；
5. 按 `TrainingConfig` 中的模式閾值輸出安全或惡意判定。

Pro 模式在第 3 步會切出 4 個子向量分別推理，第 4 步對 Fusion 模型推理。Adaptive 模式會按路由流程多次執行步驟 3–5。

## 模型發現 {#ModelDiscovery}

預設模型發現順序：

1. 執行目錄（`AppContext.BaseDirectory`）
2. 組件嵌入資源（`GetManifestResourceStream`）
3. 組件所在目錄

生產整合時應確保所有 `.onnx` 檔案隨應用一同發布，不要依賴嵌入資源或開發目錄。
