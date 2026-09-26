---
title: Build and Installation
description: Requirements, source build, and driver installation guide for Xdows Security 5.
---

# Build and Installation {#Build}

## Requirements {#Requirements}

- Windows 10/11. The app targets `net10.0-windows10.0.26100.0` with a minimum platform version of `10.0.17763.0` (Windows 10 1809).
- Git and Visual Studio 2026.
- .NET 10, WinUI 3, the MSVC C++ toolchain, and WDK integration.
- A Windows SDK/WDK version that matches the project; the current driver project uses `10.0.28000.0`.
- Administrator rights to install and run the drivers.
- Access to GitHub and NuGet feeds.
- Rust 1.74 or later, only if you also build the optional `Xdows-Model-Invoker-Rust` crate.

## Build from Source {#FromSource}

Clone the repositories under the same parent directory. The first three are required; the Rust invoker is optional and only needed if you want to consume the models from Rust.

```powershell
git clone https://github.com/XTY64XTY/Xdows-Security-5 Xdows-Security
git clone https://github.com/XTY64XTY/Xdows-Model
git clone https://github.com/XTY64XTY/Xdows-Security-Driver
git clone https://github.com/XTY64XTY/Xdows-Model-Invoker-Rust   # optional
```

Build `Xdows-Security\Xdows-Security.slnx` with Visual Studio or Visual Studio MSBuild. Use `Debug|x64` for normal development validation and `Release|x64` for release validation. The main solution builds the native model, main driver, and BootFilter and copies their assets into the app output.

```powershell
& 'D:\Visual-Studio\MSBuild\Current\Bin\amd64\MSBuild.exe' `
  'D:\Code\Xdows-Security\Xdows-Security.slnx' `
  /p:Configuration=Debug `
  /p:Platform=x64 `
  /p:WindowsTargetPlatformVersion=10.0.28000.0 `
  /p:SignMode=Off `
  /m
```

The app is published self-contained with AOT enabled (`PublishAot`, `PublishTrimmed`, `WindowsAppSDKSelfContained`), so use the Publish action in Visual Studio or `dotnet publish` when you need the AOT output.

The complete output must include at least:

- `Xdows-Model-Native.dll`, the ONNX models, and ONNX Runtime dependencies.
- `Driver\Xdows-Security-Driver.inf`, `Xdows-Security-Driver.sys`, and the catalog file.
- `Driver\BootFilter\Xdows-Security-BootFilter.inf`, `Xdows-Security-BootFilter.sys`, and the catalog file.

:::note
An environment with only the `dotnet` CLI cannot build the WDK `.vcxproj` driver projects completely. If you see `MSB4278` or a missing `Microsoft.Cpp.Default.props`, install Visual Studio C++ MSBuild and WDK integration and rebuild with Visual Studio MSBuild. Do not hide these errors by skipping the driver projects.
:::

## Install the Drivers {#Install}

Use the main app flow for first-time installation:

1. Run `Xdows-Security.exe` from the complete build output as administrator.
2. Enable Driver Protection and accept the risk disclosure.
3. The app registers the device as needed, installs the main driver and BootFilter, starts their services, and connects the bridge.
4. If any step fails, use the per-group repair action in Driver Environment and refresh the checks.

If the target system does not trust a local development signature, enable test signing only on a recoverable test machine or disposable VM and follow your organization's policy. Production packages require a trusted production signature and must not ask end users to weaken system signing policy.
