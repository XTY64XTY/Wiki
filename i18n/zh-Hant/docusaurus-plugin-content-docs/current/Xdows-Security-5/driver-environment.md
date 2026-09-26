---
title: 驅動程式環境檢測
description: Xdows Security 5 驅動程式環境檢測的四項檢查群組、修復操作和測試簽章說明。
---

# 驅動程式環境檢測 {#DriverEnvironment}

驅動程式環境檢測將狀態合併為四組。主驅動程式與 BootFilter 在同一組內分別顯示狀態，但這不表示它們可以單獨開啟。

## 檢查群組 {#Groups}

| 檢查群組 | 檢查內容 | 常見處理 |
|---------|---------|---------|
| 執行權限 | 目前處理程序是否具有系統管理員權限 | 以系統管理員身分重新啟動 Xdows Security |
| 驅動程式簽章與系統原則 | 開發環境的測試簽章狀態，以及驅動程式套件目前的發佈範圍 | 開發時使用可復原的測試機；目前發佈範圍為開發與測試機簽章，不包含正式 EV、attestation 或 HLK 簽章流程 |
| 雙驅動程式套件及服務 | 主驅動程式和 BootFilter 的 INF、SYS、CAT 套件及對應服務 | 保留完整發佈目錄，使用逐項修復重新安裝或啟動元件 |
| 雙驅動程式通訊與模型資源 | 主驅動程式通訊、BootFilter 通訊和原生模型資源 | 啟動服務、修復套件或重新產生完整方案輸出 |

## 修復操作 {#Repair}

修復操作完成後，環境檢測會重新檢查對應狀態。簽章檢查為警告並不一定表示正式簽章驅動程式不可用：系統信任的正式簽章不需要依賴測試簽章模式。

## 手動檢查 {#Inspection}

主程式會自行安裝並啟動驅動程式，但同樣的狀態也可以在測試機上從提權的 PowerShell 工作階段檢查：

```powershell
sc query Xdows-Security-Driver
pnputil /enum-drivers | findstr /i Xdows
```

從原始碼建置後，預期的驅動程式套件目錄為：

```text
D:\Code\Xdows-Security-Driver\x64\Debug\Xdows-Security-Driver
```

其中包含 `Xdows-Security-Driver.inf`、`Xdows-Security-Driver.sys` 及 `xdows-security-driver.cat`。首次安裝時請優先使用主程式流程，讓 `Root\XdowsSecurityDriver` 根裝置在套件繫結前建立；`pnputil /add-driver ... /install` 接著 `sc start Xdows-Security-Driver` 適用於該裝置已存在後的升級或診斷。

:::caution
測試簽章僅供開發和測試使用。不要把啟用測試簽章模式作為正式部署策略。在開發機器上，透過 `bcdedit /set testsigning on` 後重新開機來啟用，且只能在一次性虛擬機或可復原的測試機上進行。
:::
