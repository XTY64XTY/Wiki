# 開始使用 {#GetStarted}

查看使用 `WinUI 3` + `C#` 構建的下一代防毒軟體。

## 介紹 {#Info}

Xdows Security 4.1 是一款使用 `WinUI 3` 和 `C#` 構建的防毒軟體。

## 下載 {#Download}

<Linkcard url="https://github.com/LoveProgrammingMint/Xdows-Security/releases" title="下載 Xdows Security Beta" description="https://github.com/LoveProgrammingMint/Xdows-Security/releases" logo="/logo.ico"/>

## 常見問題 {#Question}

### 搜曉引擎無法使用

請確保您的裝置上已安裝 `Visual C++ Redistributable v14` 或等效的替代方案。

| 架構 | 連結 | 備註 |
|------|------|------|
| ARM64 | <https://aka.ms/vc14/vc_redist.arm64.exe> | 最新支援的 ARM64 版本永久連結 |
| X86 | <https://aka.ms/vc14/vc_redist.x86.exe> | 最新支援的 x86 版本永久連結 |
| X64 | <https://aka.ms/vc14/vc_redist.x64.exe> | 最新支援的 x64 版本永久連結。x64 可轉發套件同時包含 ARM64 和 x64 二進位檔案。在 ARM64 裝置上安裝時，它也可以安裝所需的 Visual C++ ARM64 二進位檔案。 |

（來源：[Microsoft Learn](https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist?view=msvc-170)）

### 缺少 Windows App SDK

> [!NOTE] 這通常不應該發生。
>
> 下載的 Xdows Security 套件是自包含的，包含所需的 Windows App SDK。只有在套件損壞或發生其他問題時才會出現此問題。

從 [Microsoft Learn](https://learn.microsoft.com/windows/apps/windows-app-sdk/downloads) 下載 Windows App SDK。

> [!NOTE] 執行後出現主控台視窗
>
> 這是正常行為。如果它沒有自動關閉，您可以在安裝後手動關閉它。

> [!NOTE] 安裝後仍回報缺少
>
> 在撰寫本文時，Windows App SDK 向後不相容。確保安裝的版本完全符合所需版本（既不更高也不更低）。

### 未安裝 .NET

> [!NOTE] 這通常不應該發生。
>
> 下載的 Xdows Security 套件是自包含的，包含所需的 .NET 執行階段。只有在套件損壞或發生其他問題時才會出現此問題。

從 [Microsoft 官方網站](https://dotnet.microsoft.com/download) 下載所需的 .NET 版本。

> [!NOTE] 安裝後仍回報缺少
>
> 在撰寫本文時，主要的 .NET 版本向後不相容。確保主要版本符合所需版本（既不更高也不更低）。

## 掃描引擎 {#Engine}

| 名稱 | 說明 | 開放原始碼 |
|------|------|-------------|
| Xdows Local | 使用匯入表、匯出表和其他方法分析 PE 檔案 | 完全開放原始碼 |
| 搜曉 | 由 `Mint` 提供的掃描引擎，基於多種分析技術 | 部分開放原始碼 |
| 雲端掃描引擎 | 由 `MEMZUAC` 提供的雲端掃描服務 | 閉源 |
| CzkCloud | 由 `天啟星圖網路科技` 提供的雲端掃描服務 | 閉源 |

::: tip 提示
為了保護 API 金鑰，Beta 版本不支援 CzkCloud。
:::

## 建構和執行 {#Build}

1. 需求：
    - 作業系統：Windows 10/11
    - 軟體：Git、Visual Studio 2026
    - 網路：正常存取 GitHub
    - 工作負載：請開啟方案以檢查

2. 建構和執行：

    1. 複製存放庫

      ```sh
      git clone https://github.com/LoveProgrammingMint/Xdows-Security   
      git clone https://github.com/LoveProgrammingMint/SouXiaoAVEngine   
      git clone https://github.com/LoveProgrammingMint/ICEX   
      ```

    1. 建構專案

      只需建構 `Xdows-Security.slnx` 方案

      或使用發佈功能啟用 AOT 編譯

## 授權 {#License}

本專案依據 AGPL-3.0 授權。詳情請參閱 [LICENSE](https://github.com/LoveProgrammingMint/Xdows-Security/blob/master/LICENSE.txt)。
