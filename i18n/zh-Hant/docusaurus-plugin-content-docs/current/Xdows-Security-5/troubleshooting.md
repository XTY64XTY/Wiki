---
title: 疑難排解
description: Xdows Security 5 的常見問題、疑難排解表和安全驗證邊界。
---

# 疑難排解 {#Troubleshooting}

## 常見問題 {#FAQ}

| 現象 | 處理 |
|-----|------|
| 無法啟用驅動程式防護 | 先開啟驅動程式環境檢測；依次檢查執行權限、簽章原則、雙驅動程式套件/服務、雙驅動程式通訊和模型資源 |
| 主驅動程式或 BootFilter 套件缺失 | 重新完整解壓縮發佈套件；從原始碼建置時使用主方案和 VS/MSBuild，不要只產生受控專案 |
| 驅動程式因簽章失敗而無法載入 | 開發建置僅在可復原測試環境使用測試簽章；正式套件應驗證 SYS/CAT 的可信正式簽章 |
| 服務已安裝但通訊失敗 | 重新整理環境檢測，確認主驅動程式和 BootFilter 服務均在執行；修復後重試，仍失敗時查看應用程式與驅動程式記錄 |
| 提示協定或建置不相符 | 主程式、主驅動程式和 BootFilter 必須來自同一發佈套件；不要混用舊的 `Driver` 目錄 |
| `MSB4278`、`Microsoft.Cpp.Default.props`、Inf2Cat 或 SignTool 缺失 | 安裝或修復 Visual Studio C++、Windows SDK 和 WDK 整合，並用 Visual Studio MSBuild 建置 |
| 無法使用 Xdows Model | 安裝 [Visual C++ Redistributable v14](https://learn.microsoft.com/zh-tw/cpp/windows/latest-supported-vc-redist?view=msvc-170)，並確認原生模型和 ONNX Runtime 檔案完整 |
| Windows App SDK 或 .NET 缺失 | 正式發佈套件通常自包含所需執行階段；如果套件損壞請重新下載，否則安裝與該版本相符的 [Windows App SDK](https://learn.microsoft.com/zh-tw/windows/apps/windows-app-sdk/downloads) 和 [.NET](https://dotnet.microsoft.com/zh-tw/download) |
| 無法建立 R3 開機基準 | 確認應用程式以系統管理員身分執行、目前系統可正常啟動且磁碟存取未被其他安全軟體阻止；只在確認目前狀態可信時重建基準 |
| R3 登錄檔反覆提示 | 查看記錄確認修改者和規則類別，升級到同一發佈套件的最新元件；不要透過關閉 R0 驅動程式模組來規避問題 |

## 安全驗證邊界 {#SafetyBoundary}

原始碼冒煙、協定鏡像和非破壞性建置檢查不能取代真實核心執行階段驗證。實體磁碟寫入、EFI 修復、篩選驅動程式卸載和 R0 核心登錄檔阻擋等破壞性場景，只應在帶快照且可復原的一次性虛擬機器中驗收。本文不宣稱這些場景已在目前主機完成執行階段驗證。
