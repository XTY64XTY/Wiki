---
title: Xdows Security 5
description: Xdows Security 5 快速開始、下載與首次執行指南。
---

# 快速開始 {#GetStarted}

Xdows Security 5 是使用 WinUI 3 和 C# 建置的開源 Windows 安全防護產品，依 MIT 授權條款發佈。它同時提供使用者模式 R3 防護和驅動程式支援的 R0 防護，使用自研的 Xdows Model 本機模型進行惡意檔案偵測。

## 下載與首次執行 {#Download}

1. 從 [Releases](https://github.com/XTY64XTY/Xdows-Security-5/releases) 下載最新版本的 `Xdows-Security.zip`。
2. 將壓縮檔完整解壓縮到本機目錄。不要只複製 `Xdows-Security.exe`，驅動程式套件、BootFilter 和原生模型資源必須保留原有目錄結構。
3. 執行 `Xdows-Security.exe`。使用掃描功能不一定需要系統管理員權限；安裝、啟動、修復或停止驅動程式時必須以系統管理員身分執行。
4. 需要 R0 防護時，在設定中啟用驅動程式防護。程式會檢查環境、安裝主驅動程式與 BootFilter，並建立通訊。
5. 如果啟用失敗，請開啟驅動程式環境檢測，按照檢查群組提供的修復操作處理後重新整理。

<LinkCard url="https://github.com/XTY64XTY/Xdows-Security-5/releases" title="下載 Xdows Security 5" description="https://github.com/XTY64XTY/Xdows-Security-5/releases" logo="/logo.ico"/>
<LinkCard url="https://qm.qq.com/q/ybEtoc5rFe" title="進入 QQ 群" description="https://qm.qq.com/q/ybEtoc5rFe" logo="/logo.ico"/>

:::note
如果 GitHub 無法存取或下載緩慢，可透過 QQ 群取得發佈套件。
:::

:::info
BootFilter 是獨立的儲存體篩選驅動程式，但它隨 Xdows Security 驅動程式套件一同發佈，並隨「驅動程式防護」整體啟停。R0 開機防護和 R0 登錄檔防護都沒有獨立開關。
:::

## 接下來 {#Next}

- [保護能力](./protection) — 瞭解 R0/R3 防護邊界、開關策略和掃描引擎
- [驅動程式環境檢測](./driver-environment) — 四項檢查群組說明和修復操作
- [建置與安裝](./build) — 從原始碼建置和驅動程式安裝指南
- [疑難排解](./troubleshooting) — 常見問題與安全驗證邊界

## 版權說明 {#License}

該專案使用 MIT 授權條款，詳情請參閱 [LICENSE](https://github.com/XTY64XTY/Xdows-Security-5/blob/main/LICENSE.txt)。
