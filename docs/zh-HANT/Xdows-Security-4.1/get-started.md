> [!NOTE] 通知
> Xdows Security 正在成為 IceZero AntiVirus

# 快速開始 {#GetStarted}

來看看下一代基於 `WinUI3` + `C#` 技術構建的防毒軟體

## 簡介 {#Info}

Xdows Security 4.1 是一個基於 `WinUI3` + `C#` 技術構建的防毒軟體。

## 下載 {#Download}

<Linkcard url="https://github.com/LoveProgrammingMint/Xdows-Security/releases" title="下載 Xdows Security Beta" description="https://github.com/LoveProgrammingMint/Xdows-Security/releases" logo="/logo.ico"/>

## 常見問題 {#Question}

### 無法使用 SouXiao 引擎

請確保您的裝置中安裝了 `Visual C++ Redistributable v14` 或其替代方案

| 體系結構 | 連結 | 備註 |
|---------|------|------|
| ARM64 | <https://aka.ms/vc14/vc_redist.arm64.exe> | 最新受支援 ARM64 版本的永久連結 |
| X86 | <https://aka.ms/vc14/vc_redist.x86.exe> | 最新受支援 x86 版本的永久連結 |
| X64 | <https://aka.ms/vc14/vc_redist.x64.exe> | 最新受支援 x64 版本的永久連結。X64 可再發行套件包含 ARM64 和 X64 二進位檔案。當 X64 可再發行套件安裝在 ARM64 裝置上時，可以透過此套件輕鬆安裝所需的 Visual C++ ARM64 二進位檔案。 |

（取自 [Microsoft Learn](https://learn.microsoft.com/zh-cn/cpp/windows/latest-supported-vc-redist?view=msvc-170)）

### Windows App SDK 不存在

> [!NOTE] 正常一般不會出現
>
> 下載的 Xdows Security 應自包含所需 Windows App SDK 如果失效或其它問題才會出現這個問題

在 [Microsoft Learn](https://learn.microsoft.com/zh-cn/windows/apps/windows-app-sdk/downloads) 中下載 Windows App SDK

> [!NOTE] 關於執行後出現的主控台視窗
>
> 這是正常現象，安裝完成後可自行退出（如果沒有自動關閉的話）

> [!NOTE] 安裝完成後還是提示不存在
>
> Windows App SDK 在本文編寫時沒有向後相容性，請確保下載版本與所需版本一致（既不能過高也不能過低）

### 沒有安裝 .NET

> [!NOTE] 正常一般不會出現
>
> 下載的 Xdows Security 應自包含所需 .NET 如果失效或其它問題才會出現這個問題

在 [Microsoft 官網](https://dotnet.microsoft.com/zh-cn/download) 中下載所需的 .NET 版本

> [!NOTE] 安裝完成後還是提示不存在
>
> .NET 在本文編寫時大版本沒有向後相容性，請確保下載版本的大版本與所需版本一致（既不能過高也不能過低）

## 掃描引擎 {#Engine}

| 名稱 | 介紹 | 開源 |
|-----|------|------|
| Xdows Local | 使用匯入表、匯出表等多種方式分析 PE 檔案 | 全部開源 |
| SouXiao | 由 `Mint` 提供掃描引擎，基於多種分析方式| 部分開源 |
| 基於雲的掃描引擎 | 由 `MEMZUAC` 提供的雲掃描服務 | 不開源 |
| CzkCloud | 由 `天啟星圖網路科技` 提供的雲掃描服務 | 不開源 |

::: tip 提示
 因為需要保護 ApiKey 故在 Beta 版中不支援 CzkCloud
:::

## 編譯執行 {#Build}

1. 環境要求：
    - 作業系統：Windows 10/11
    - 軟體環境：Git、Visual Studio 2026
    - 網路環境：正常存取 GitHub
    - 工作負載：請打開解決方案查看

2. 編譯執行:

    1. 克隆儲存庫

      ```sh
      git clone https://github.com/LoveProgrammingMint/Xdows-Security
      git clone https://github.com/LoveProgrammingMint/SouXiaoAVEngine
      git clone https://github.com/LoveProgrammingMint/ICEX
      git clone https://github.com/XTY64XTY/Xdows-Model
      ```

    1. 產生項目

      直接編譯 `Xdows-Security.slnx` 解決方案即可

      或使用發布功能以使用 AOT

## 版權說明 {#License}

該專案签署了 AGPL-3.0 授權許可，詳情請参阅 [LICENSE](https://github.com/LoveProgrammingMint/Xdows-Security/blob/master/LICENSE.txt)