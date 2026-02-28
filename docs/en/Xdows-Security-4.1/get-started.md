# Quick Start {#GetStarted}

Take a look at the next-generation antivirus software built with `WinUI 3` + `C#`.

## Introduction {#Info}

Xdows Security 4.1 is an antivirus software built using `WinUI 3` and `C#`.

## Download {#Download}

<Linkcard url="https://github.com/XTY64XTY12345/Xdows-Security/releases" title="Download Xdows Security Beta" description="https://github.com/XTY64XTY12345/Xdows-Security/releases" logo="/logo.ico"/>

## FAQ {#Question}

### SouXiao engine cannot be used

Please make sure that `Visual C++ Redistributable v14` or an equivalent alternative is installed on your device.

| Architecture | Link | Notes |
|-------------|------|-------|
| ARM64 | <https://aka.ms/vc14/vc_redist.arm64.exe> | Permanent link to the latest supported ARM64 version |
| X86 | <https://aka.ms/vc14/vc_redist.x86.exe> | Permanent link to the latest supported x86 version |
| X64 | <https://aka.ms/vc14/vc_redist.x64.exe> | Permanent link to the latest supported x64 version. The x64 redistributable includes both ARM64 and x64 binaries. When installed on an ARM64 device, it can also install the required Visual C++ ARM64 binaries. |

(Source: [Microsoft Learn](https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist?view=msvc-170))

### Windows App SDK is missing

> [!NOTE] This should not normally occur.
>
> The downloaded Xdows Security package is self-contained and includes the required Windows App SDK. This issue should only appear if the package is broken or other problems occur.

Download the Windows App SDK from [Microsoft Learn](https://learn.microsoft.com/windows/apps/windows-app-sdk/downloads).

> [!NOTE] Console window appears after running
>
> This is normal behavior. You may close it manually after installation if it does not close automatically.

> [!NOTE] Still reported as missing after installation
>
> At the time of writing, the Windows App SDK is not backward-compatible. Make sure the installed version exactly matches the required version (neither higher nor lower).

### .NET is not installed

> [!NOTE] This should not normally occur.
>
> The downloaded Xdows Security package is self-contained and includes the required .NET runtime. This issue should only appear if the package is broken or other problems occur.

Download the required .NET version from the [official Microsoft website](https://dotnet.microsoft.com/download).

> [!NOTE] Still reported as missing after installation
>
> At the time of writing, major .NET versions are not backward-compatible. Make sure the major version matches the required version (neither higher nor lower).

## Scan Engines {#Engine}

| Name | Description | Open Source |
|------|-------------|-------------|
| Xdows Local | Analyzes PE files using import tables, export tables, and other methods | Fully open source |
| SouXiao | Scan engine provided by `Mint`, based on multiple analysis techniques | Partially open source |
| Cloud-based Scan Engine | Cloud scanning service provided by `MEMZUAC` | Closed source |
| CzkCloud | Cloud scanning service provided by `Tianqi StarMap Network Technology` | Closed source |

::: tip Tip
CzkCloud is not supported in the Beta build in order to protect the API key.
:::

## Build & Run {#Build}

1. Requirements:
    1. Windows 10 / 11
    2. Visual Studio 2022 or later with required workloads installed
    3. Git installed and able to access GitHub normally
2. Clone the repository:
```sh
git clone https://github.com/XTY64XTY12345/Xdows-Security
````

3. Open the project in Visual Studio and build it
