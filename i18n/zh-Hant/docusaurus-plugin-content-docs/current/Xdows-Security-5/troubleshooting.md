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
| 驅動程式因簽章失敗而無法載入 | 開發建置僅在可復原測試環境使用測試簽章；目前發佈範圍為開發與測試機簽章，不包含正式 EV、attestation 或 HLK 簽章流程 |
| 服務已安裝但通訊失敗 | 重新整理環境檢測，確認主驅動程式和 BootFilter 服務均在執行；修復後重試，仍失敗時查看應用程式與驅動程式記錄 |
| 提示協定或建置不相符 | 主程式、主驅動程式和 BootFilter 必須來自同一發佈套件；不要混用舊的 `Driver` 目錄。主驅動程式與橋接使用協定 v9，BootFilter 使用自己的 v1 |
| `MSB4278`、`Microsoft.Cpp.Default.props`、Inf2Cat 或 SignTool 缺失 | 安裝或修復 Visual Studio C++、Windows SDK 和 WDK 整合，並用 Visual Studio MSBuild 建置 |
| `inf2cat` 回報 `DriverVer set to a date in the future` | 保持驅動程式專案中的 `Inf2CatUseLocalTime` 為啟用狀態並重新建置；這可避免在午夜前後發生 UTC/本機時間不符 |
| 無法使用 Xdows Model | 安裝 [Visual C++ Redistributable v14](https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist?view=msvc-170)，並確認原生模型和 ONNX Runtime 檔案完整。確認主程式同層的 `Models\` 含有 `Xdows-Model-Pro.manifest.json` 及全部五個 Pro 分支模型 |
| 模型更新後 Pro 或 Adaptive 掃描立即失敗 | Pro 模型、其五個分支模型和其 manifest 必須一同部署；缺少相符 manifest 的五輸入 Fusion 模型會被設計上拒絕 |
| Windows App SDK 或 .NET 缺失 | 正式發佈套件通常自包含所需執行階段；如果套件損壞請重新下載，否則安裝與該版本相符的 [Windows App SDK](https://learn.microsoft.com/windows/apps/windows-app-sdk/downloads) 和 [.NET](https://dotnet.microsoft.com/download) |
| 無法建立 R3 開機基準 | 以系統管理員身分執行主程式，確認目前系統可正常啟動且磁碟存取未被阻止；只在確認目前狀態可信時建立新基準 |
| R3 登錄檔反覆提示 | 查看記錄確認修改者和規則類別，然後從同一發佈套件更新所有元件；不要透過關閉 R0 驅動程式模組來規避問題 |

## 驗證指令碼 {#Scripts}

原始碼層級的檢查與擁有該程式碼的倉庫放在一起，而非與主程式放在一起：

| 檢查 | 指令碼 |
|-------|--------|
| 驅動程式套件與簽章 | `Xdows-Security-Driver\tests\Invoke-DriverPackageSmoke.ps1` |
| 核心模組原始碼冒煙（行為、檔案、登錄檔、自我防護、處理程序管理員、開機篩選器、關機權杖、決策逾時） | `Xdows-Security-Driver\tests\Invoke-*SourceSmoke.ps1` |
| 託管與原生模型一致性 | `Xdows-Model\tests\Invoke-NativeConsistency.ps1 -SkipBuild` |
| VM、Driver Verifier、壓力與效能證據 | `Xdows-Security-Driver\tests\driver-validation-matrix.md` |

## 安全驗證邊界 {#SafetyBoundary}

原始碼冒煙、協定鏡像和非破壞性建置檢查不能取代真實核心執行階段驗證。實體磁碟寫入、EFI 修復、篩選驅動程式卸載和 R0 核心登錄檔阻擋等破壞性場景，只應在帶快照且可復原的一次性虛擬機器中驗收。本文不宣稱這些場景已在目前主機完成執行階段驗證。

絕對不要在不可復原的主機上執行 Driver Verifier；一律使用 VM 快照。
