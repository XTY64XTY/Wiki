---
title: Build and Installation
description: Requirements, source build, and driver installation guide for Xdows Security 5.
---

# Build and Installation {#Build}

## Requirements {#Requirements}

- Windows 10/11.
- Git and Visual Studio 2026.
- .NET 10, WinUI 3, the MSVC C++ toolchain, and WDK integration.
- A Windows SDK/WDK version that matches the project; the current driver project uses `10.0.28000.0`.
- Administrator rights to install and run the drivers.
- Access to GitHub and NuGet feeds.

## Build from Source {#FromSource}

Clone the three repositories under the same parent directory:

```powershell
git clone https://github.com/XTY64XTY/Xdows-Security-5 Xdows-Security
git clone https://github.com/XTY64XTY/Xdows-Model
git clone https://github.com/XTY64XTY/Xdows-Security-Driver
```

Build `Xdows-Security\Xdows-Security.slnx` with Visual Studio or Visual Studio MSBuild. Use `Debug|x64` for normal development validation and `Release|x64` for release validation. The main solution builds the native model, main driver, and BootFilter and copies their assets into the app output.

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
