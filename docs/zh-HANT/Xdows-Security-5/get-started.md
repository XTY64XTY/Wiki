---
title: Xdows Security 5
description: Xdows Security 5 快速開始、R0/R3 防護邊界、驅動程式環境、建置安裝和疑難排解指南。
---

# 快速開始 {#GetStarted}

Xdows Security 5 是使用 WinUI 3 和 C# 建置的開源 Windows 安全防護產品，依 MIT 授權條款發佈。

## 下載與首次執行 {#Download}

1. 從 [Releases](https://github.com/XTY64XTY/Xdows-Security-5/releases) 下載最新版本的 `Xdows-Security.zip`。
2. 將壓縮檔完整解壓縮到本機目錄。不要只複製 `Xdows-Security.exe`，驅動程式套件、BootFilter 和原生模型資源必須保留原有目錄結構。
3. 執行 `Xdows-Security.exe`。使用掃描功能不一定需要系統管理員權限；安裝、啟動、修復或停止驅動程式時必須以系統管理員身分執行。
4. 需要 R0 防護時，在設定中啟用驅動程式防護。程式會檢查環境、安裝主驅動程式與 BootFilter，並建立通訊。
5. 如果啟用失敗，請開啟驅動程式環境檢測，按照檢查群組提供的修復操作處理後重新整理。

<Linkcard url="https://github.com/XTY64XTY/Xdows-Security-5/releases" title="下載 Xdows Security 5" description="https://github.com/XTY64XTY/Xdows-Security-5/releases" logo="/logo.ico"/>

> [!IMPORTANT]
> BootFilter 是獨立的儲存體篩選驅動程式，但它隨 Xdows Security 驅動程式套件一同發佈，並隨「驅動程式防護」整體啟停。R0 開機防護和 R0 登錄檔防護都沒有獨立開關。

## 防護能力與層級邊界 {#Protection}

Xdows Security 同時提供使用者模式 R3 防護和驅動程式支援的 R0 防護。兩者不是兩個可獨立安裝的產品，也不能把 R3 的偵測結果等同於核心在操作發生前的阻擋。

| 防護領域 | R3 使用者模式職責 | R0 驅動程式職責 |
|---------|------------------|-----------------|
| 處理程序與檔案 | 在使用者模式監控、掃描、記錄並執行相容防護流程 | 在處理程序建立及檔案建立、寫入、重新命名等操作完成前提交事件並等待決策 |
| 高風險行為 | 提供使用者模式偵測、記錄和相容處理，但不承擔核心前置攔截 | 攔截高風險命令行為、敏感控制代碼操作和注入相關行為，並統一進入使用者決策流程 |
| 開機防護 | 建立可信開機基準，監控原始開機結構及作用中的 EFI/BCD 檔案；偵測差異後修復並讓使用者決定保留修復或放行並更新基準 | 主驅動程式保護 EFI/BCD 檔案寫入；獨立 BootFilter 保護系統磁碟的原始開機區域寫入，在寫入完成前等待使用者模式決策 |
| 登錄檔防護 | 透過 ETW 觀察受保護規則的變更，合併重複事件、識別並掃描修改者、記錄並詢問使用者；阻擋選擇發生在偵測之後，不能取代交易層級復原 | 透過核心登錄檔回呼，在建立、設定值、刪除值、刪除機碼、重新命名、還原、取代和卸載操作完成前等待使用者決策 |
| 自我防護 | 負責主程式狀態、記錄和使用者互動 | 限制針對受保護處理程序的危險控制代碼和注入前置條件，並驗證受控關閉 |

### 開關與失敗策略

- 「驅動程式防護」是 R0 能力的總開關。R0 開機防護、R0 登錄檔防護和 BootFilter 不提供獨立開關。
- 設定中的登錄檔總開關及「輔助規則」「其他規則」只控制 R3 登錄檔防護及其規則類別，不單獨控制 R0 登錄檔模組。
- R0 登錄檔與開機操作需要使用者模式橋接提供決策。橋接缺失、等待逾時或資源不足時，受保護操作會依保守策略拒絕並記錄。
- BootFilter 使用獨立協定 v1；主驅動程式與受控橋接使用協定 v9。兩套協定不能混用。
- 目前主驅動程式身分為協定 v9、組建 ID `2026073001`、功能遮罩 `0x000003FF`；必要模組遮罩包含 Registry (`0x40`)。

### 掃描引擎

| 名稱 | 介紹 | 開源 |
|-----|------|------|
| Xdows Local | 使用匯入表、匯出表等靜態特徵分析 PE 檔案 | 全部開源 |
| Xdows Model | 使用 ONNX 模型進行偵測，支援 Flash、Standard、Adaptive 和 Pro 模式 | 全部開源 |
| 雲端掃描引擎 | 由 `MEMZUAC` 提供的雲端掃描服務 | 不開源 |

Xdows Tools 是產品內建的工具集；產品名稱一律寫作 `Xdows Tools`。

## 驅動程式環境 {#DriverEnvironment}

驅動程式環境檢測將狀態合併為四組。主驅動程式與 BootFilter 在同一組內分別顯示狀態，但這不表示它們可以單獨開啟。

| 檢查群組 | 檢查內容 | 常見處理 |
|---------|---------|---------|
| 執行權限 | 目前處理程序是否具有系統管理員權限 | 以系統管理員身分重新啟動 Xdows Security |
| 驅動程式簽章與系統原則 | 開發環境的測試簽章狀態，以及正式簽章和系統原則提示 | 開發環境使用可復原測試機；正式發佈使用可信的正式簽章 |
| 雙驅動程式套件及服務 | 主驅動程式和 BootFilter 的 INF、SYS、CAT 套件及對應服務 | 保留完整發佈目錄，使用逐項修復重新安裝或啟動 |
| 雙驅動程式通訊與模型資源 | 主驅動程式通訊、BootFilter 通訊和原生模型資源 | 啟動服務、修復套件或重新產生完整方案輸出 |

修復操作完成後，環境檢測會重新檢查對應狀態。簽章檢查為警告並不一定表示正式簽章驅動程式不可用：系統信任的正式簽章不需要依賴測試簽章模式。

> [!WARNING]
> 測試簽章只適用於開發和測試環境。不要把啟用測試簽章模式作為正式發佈或生產部署方案；正式發佈必須使用 Windows 信任的正式驅動程式簽章。

## 建置與安裝 {#Build}

### 環境需求

- Windows 10/11。
- Git 和 Visual Studio 2026。
- .NET 10、WinUI 3、MSVC C++ 工具鏈和 WDK 整合。
- 與專案相符的 Windows SDK/WDK；目前驅動程式專案使用 `10.0.28000.0`。
- 安裝和執行驅動程式所需的系統管理員權限。
- 能正常存取 GitHub 及 NuGet 來源。

### 從原始碼建置

將三個存放庫複製到同一父目錄：

```powershell
git clone https://github.com/XTY64XTY/Xdows-Security-5 Xdows-Security
git clone https://github.com/XTY64XTY/Xdows-Model
git clone https://github.com/XTY64XTY/Xdows-Security-Driver
```

使用 Visual Studio 或 Visual Studio MSBuild 建置 `Xdows-Security\Xdows-Security.slnx`，開發驗證通常選擇 `Debug|x64`，發佈驗證選擇 `Release|x64`。主方案會同時建置原生模型、主驅動程式和 BootFilter，並將資產複製到主程式輸出。

完整輸出至少應包含：

- `Xdows-Model-Native.dll`、ONNX 模型和 ONNX Runtime 相依項目。
- `Driver\Xdows-Security-Driver.inf`、`Xdows-Security-Driver.sys` 及 CAT 簽章目錄檔案。
- `Driver\BootFilter\Xdows-Security-BootFilter.inf`、`Xdows-Security-BootFilter.sys` 及 CAT 簽章目錄檔案。

> [!NOTE]
> 只有 `dotnet` CLI 的環境不能完整建置 WDK `.vcxproj` 驅動程式專案。出現 `MSB4278` 或缺少 `Microsoft.Cpp.Default.props` 時，請安裝 Visual Studio C++ MSBuild 與 WDK 整合，並使用 Visual Studio MSBuild 重新建置；這類錯誤不應透過跳過驅動程式專案來掩蓋。

### 安裝驅動程式

首次安裝優先使用主程式流程：

1. 以系統管理員身分執行完整建置輸出中的 `Xdows-Security.exe`。
2. 啟用「驅動程式防護」並接受風險提示。
3. 主程式視需要註冊裝置、安裝主驅動程式和 BootFilter、啟動服務並連接橋接通道。
4. 如果任一步驟失敗，使用驅動程式環境檢測的逐項修復並重新整理。

本機開發簽章不受目標系統信任時，只能在可復原的測試機或一次性虛擬機器中依組織原則啟用測試簽章。正式安裝套件必須使用可信的正式簽章，不能要求最終使用者降低系統簽章原則。

## 疑難排解 {#Troubleshooting}

| 現象 | 處理 |
|-----|------|
| 無法啟用驅動程式防護 | 先開啟驅動程式環境檢測；依序檢查執行權限、簽章原則、雙驅動程式套件/服務、雙驅動程式通訊和模型資源 |
| 主驅動程式或 BootFilter 套件缺失 | 重新完整解壓縮發佈套件；從原始碼建置時使用主方案和 VS/MSBuild，不要只建置受控專案 |
| 驅動程式因簽章失敗而無法載入 | 開發建置僅在可復原測試環境使用測試簽章；正式套件應驗證 SYS/CAT 的可信正式簽章 |
| 服務已安裝但通訊失敗 | 重新整理環境檢測，確認主驅動程式和 BootFilter 服務均在執行；修復後重試，仍失敗時查看應用程式與驅動程式記錄 |
| 提示協定或建置不相符 | 主程式、主驅動程式和 BootFilter 必須來自同一發佈套件；不要混用舊的 `Driver` 目錄 |
| `MSB4278`、`Microsoft.Cpp.Default.props`、Inf2Cat 或 SignTool 缺失 | 安裝或修復 Visual Studio C++、Windows SDK 和 WDK 整合，並用 Visual Studio MSBuild 建置 |
| 無法使用 Xdows Model | 安裝 [Visual C++ Redistributable v14](https://learn.microsoft.com/zh-tw/cpp/windows/latest-supported-vc-redist?view=msvc-170)，並確認原生模型和 ONNX Runtime 檔案完整 |
| Windows App SDK 或 .NET 缺失 | 正式發佈套件通常自包含所需執行階段；如果套件損壞請重新下載，否則安裝與該版本相符的 [Windows App SDK](https://learn.microsoft.com/zh-tw/windows/apps/windows-app-sdk/downloads) 和 [.NET](https://dotnet.microsoft.com/zh-tw/download) |
| 無法建立 R3 開機基準 | 確認應用程式以系統管理員身分執行、目前系統可正常啟動且磁碟存取未被其他安全軟體阻止；只在確認目前狀態可信時重建基準 |
| R3 登錄檔反覆提示 | 查看記錄確認修改者和規則類別，升級到同一發佈套件的最新元件；不要透過關閉 R0 驅動程式模組來規避問題 |

## 安全驗證邊界 {#SafetyBoundary}

原始碼冒煙、協定鏡像和非破壞性建置檢查不能取代真實核心執行階段驗證。實體磁碟寫入、EFI 修復、篩選驅動程式卸載和 R0 核心登錄檔阻擋等破壞性場景，只應在具有快照且可復原的一次性虛擬機器中驗收。本文不宣稱這些場景已在目前主機完成執行階段驗證。

## 版權說明 {#License}

該專案使用 MIT 授權條款，詳情請參閱 [LICENSE](https://github.com/XTY64XTY/Xdows-Security-5/blob/main/LICENSE.txt)。
