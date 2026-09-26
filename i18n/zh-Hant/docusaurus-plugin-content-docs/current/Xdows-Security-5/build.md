---
title: 建置與安裝
description: Xdows Security 5 的環境需求、原始碼建置和驅動程式安裝指南。
---

# 建置與安裝 {#Build}

## 環境需求 {#Requirements}

- Windows 10/11。主程式目標框架為 `net10.0-windows10.0.26100.0`，最低平台版本為 `10.0.17763.0`（Windows 10 1809）。
- Git 和 Visual Studio 2026。
- .NET 10、WinUI 3、MSVC C++ 工具鏈和 WDK 整合。
- 與專案相符的 Windows SDK/WDK 版本；目前驅動程式專案使用 `10.0.28000.0`。
- 安裝和執行驅動程式所需的系統管理員權限。
- 能正常存取 GitHub 及 NuGet 來源。
- Rust 1.74 或更新版本，僅在同時建置選用的 `Xdows-Model-Invoker-Rust` crate 時才需要。

## 從原始碼建置 {#FromSource}

將各存放庫複製到同一父目錄。前三個為必要項；Rust Invoker 為選用，僅在你想從 Rust 取用模型時才需要。

```powershell
git clone https://github.com/XTY64XTY/Xdows-Security-5 Xdows-Security
git clone https://github.com/XTY64XTY/Xdows-Model
git clone https://github.com/XTY64XTY/Xdows-Security-Driver
git clone https://github.com/XTY64XTY/Xdows-Model-Invoker-Rust   # optional
```

使用 Visual Studio 或 Visual Studio MSBuild 產生 `Xdows-Security\Xdows-Security.slnx`。開發驗證通常選擇 `Debug|x64`，發佈驗證選擇 `Release|x64`。主方案會同時產生原生模型、主驅動程式和 BootFilter，並將資產複製到主程式輸出。

```powershell
& 'D:\Visual-Studio\MSBuild\Current\Bin\amd64\MSBuild.exe' `
  'D:\Code\Xdows-Security\Xdows-Security.slnx' `
  /p:Configuration=Debug `
  /p:Platform=x64 `
  /p:WindowsTargetPlatformVersion=10.0.28000.0 `
  /p:SignMode=Off `
  /m
```

主程式以自我包含方式發佈並啟用 AOT（`PublishAot`、`PublishTrimmed`、`WindowsAppSDKSelfContained`），因此需要 AOT 輸出時請使用 Visual Studio 的發佈動作或 `dotnet publish`。

完整輸出至少應包含：

- `Xdows-Model-Native.dll`、ONNX 模型和 ONNX Runtime 相依項目。
- `Driver\Xdows-Security-Driver.inf`、`Xdows-Security-Driver.sys` 及 CAT 簽章目錄檔案。
- `Driver\BootFilter\Xdows-Security-BootFilter.inf`、`Xdows-Security-BootFilter.sys` 及 CAT 簽章目錄檔案。

:::note
只有 `dotnet` CLI 的環境不能完整產生 WDK `.vcxproj` 驅動程式專案。出現 `MSB4278` 或缺少 `Microsoft.Cpp.Default.props` 時，請安裝 Visual Studio C++ MSBuild 與 WDK 整合，並使用 Visual Studio MSBuild 重新產生；這類錯誤不應透過跳過驅動程式專案來掩蓋。
:::

## 安裝驅動程式 {#Install}

首次安裝優先使用主程式流程：

1. 以系統管理員身分執行完整建置輸出中的 `Xdows-Security.exe`。
2. 啟用「驅動程式防護」並接受風險提示。
3. 主程式視需要註冊裝置、安裝主驅動程式和 BootFilter、啟動服務並連接橋接通道。
4. 如果任一步驟失敗，使用驅動程式環境檢測的逐項修復並重新整理。

本機開發簽章不受目標系統信任時，只能在可復原的測試機或一次性虛擬機器中依組織原則啟用測試簽章。正式安裝套件必須使用可信的正式簽章，不能要求最終使用者降低系統簽章原則。
