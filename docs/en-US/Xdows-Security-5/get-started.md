---
title: Xdows Security 5
description: Quick start, R0/R3 protection boundaries, driver environment, build, installation, and troubleshooting for Xdows Security 5.
---

# Getting Started {#GetStarted}

Xdows Security 5 is an open-source Windows security product built with WinUI 3 and C#. It is released under the MIT License.

## Download and First Run {#Download}

1. Download the latest `Xdows-Security.zip` from [Releases](https://github.com/XTY64XTY/Xdows-Security-5/releases).
2. Extract the entire archive to a local directory. Do not copy only `Xdows-Security.exe`; the driver packages, BootFilter, and native model assets must keep their original directory structure.
3. Run `Xdows-Security.exe`. Scanning does not always require elevation, but installing, starting, repairing, or stopping the drivers requires administrator rights.
4. To use R0 protection, enable Driver Protection in Settings. The app checks the environment, installs the main driver and BootFilter, and establishes communication.
5. If setup fails, open Driver Environment, apply the repair action for the affected group, and refresh the checks.

<Linkcard url="https://github.com/XTY64XTY/Xdows-Security-5/releases" title="Download Xdows Security 5" description="https://github.com/XTY64XTY/Xdows-Security-5/releases" logo="/logo.ico"/>

> [!IMPORTANT]
> BootFilter is a separate storage filter driver, but it ships in the Xdows Security driver package and starts and stops with Driver Protection as a whole. R0 boot protection and R0 registry protection do not have separate switches.

## Protection Capabilities and Layer Boundaries {#Protection}

Xdows Security provides both user-mode R3 protection and driver-backed R0 protection. They are not independently installed products, and an R3 detection must not be treated as equivalent to a kernel block before an operation completes.

| Protection area | R3 user-mode responsibility | R0 driver responsibility |
|-----------------|-----------------------------|--------------------------|
| Processes and files | Monitor, scan, log, and run compatibility protection workflows in user mode | Submit events and wait for a decision before process creation and file create, write, or rename operations complete |
| High-risk behavior | Provide user-mode detection, logging, and compatibility handling without claiming kernel pre-operation interception | Intercept high-risk command behavior, sensitive handle operations, and injection-related behavior, then route them through the unified user decision flow |
| Boot protection | Create a trusted boot baseline and monitor raw boot structures and active EFI/BCD files; repair differences, then let the user keep the repair or allow the change and update the baseline | Protect EFI/BCD file writes in the main driver; protect raw system-disk boot-region writes in the separate BootFilter and wait for a user-mode decision before completion |
| Registry protection | Observe protected-rule changes through ETW, coalesce duplicate events, identify and scan the actor, log, and ask the user; blocking occurs after detection and is not transaction-level rollback | Use a kernel registry callback to wait for a user decision before create, set-value, delete-value, delete-key, rename, restore, replace, and unload operations complete |
| Self-protection | Manage app state, logs, and user interaction | Restrict dangerous handles and injection prerequisites against the protected process and validate controlled shutdown |

### Switches and Failure Policy

- Driver Protection is the aggregate switch for R0 capabilities. R0 boot protection, R0 registry protection, and BootFilter have no separate switches.
- The Registry master switch and the Secondary Rules and Other Rules settings control only R3 registry protection and its rule categories. They do not independently control the R0 registry module.
- R0 registry and boot operations require a decision from the user-mode bridge. If the bridge is unavailable, the wait expires, or resources are exhausted, protected operations are denied and logged under the conservative policy.
- BootFilter uses its independent protocol v1. The main driver and managed bridge use protocol v9. These protocols are not interchangeable.
- The current main-driver identity is protocol v9, build ID `2026073001`, and capability mask `0x000003FF`; the required module mask includes Registry (`0x40`).

### Scan Engines

| Name | Description | Open source |
|------|-------------|-------------|
| Xdows Local | Analyzes PE files using static features such as import and export tables | Fully open source |
| Xdows Model | Uses ONNX models for detection and supports Flash, Standard, Adaptive, and Pro modes | Fully open source |
| Cloud-based Scan Engine | Cloud scanning service provided by `MEMZUAC` | Closed source |

Xdows Tools is the product's built-in toolset. The product name is always written as `Xdows Tools`.

## Driver Environment {#DriverEnvironment}

Driver Environment combines status into four groups. The main driver and BootFilter report separate status within the same group, but this does not mean they can be enabled separately.

| Check group | What it checks | Typical action |
|-------------|----------------|----------------|
| Runtime privileges | Whether the current process has administrator rights | Restart Xdows Security as administrator |
| Driver signing and system policy | Development test-signing state plus guidance for production signing and system policy | Use a recoverable test machine for development; use a trusted production signature for releases |
| Both driver packages and services | The INF, SYS, and CAT packages and services for the main driver and BootFilter | Keep the full release directory and use the per-group repair action to reinstall or start components |
| Both driver communication paths and model assets | Main-driver communication, BootFilter communication, and native model assets | Start services, repair the packages, or rebuild the complete solution output |

After a repair action completes, Driver Environment checks the affected state again. A signing warning does not necessarily mean that a properly signed release driver is unavailable: a system-trusted production signature does not depend on test-signing mode.

> [!WARNING]
> Test signing is for development and testing only. Do not enable test-signing mode as a production deployment strategy. Public releases require a production driver signature trusted by Windows.

## Build and Installation {#Build}

### Requirements

- Windows 10/11.
- Git and Visual Studio 2026.
- .NET 10, WinUI 3, the MSVC C++ toolchain, and WDK integration.
- A Windows SDK/WDK version that matches the project; the current driver project uses `10.0.28000.0`.
- Administrator rights to install and run the drivers.
- Access to GitHub and NuGet feeds.

### Build from Source

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

> [!NOTE]
> An environment with only the `dotnet` CLI cannot build the WDK `.vcxproj` driver projects completely. If you see `MSB4278` or a missing `Microsoft.Cpp.Default.props`, install Visual Studio C++ MSBuild and WDK integration and rebuild with Visual Studio MSBuild. Do not hide these errors by skipping the driver projects.

### Install the Drivers

Use the main app flow for first-time installation:

1. Run `Xdows-Security.exe` from the complete build output as administrator.
2. Enable Driver Protection and accept the risk disclosure.
3. The app registers the device as needed, installs the main driver and BootFilter, starts their services, and connects the bridge.
4. If any step fails, use the per-group repair action in Driver Environment and refresh the checks.

If the target system does not trust a local development signature, enable test signing only on a recoverable test machine or disposable VM and follow your organization's policy. Production packages require a trusted production signature and must not ask end users to weaken system signing policy.

## Troubleshooting {#Troubleshooting}

| Symptom | Action |
|---------|--------|
| Driver Protection cannot be enabled | Open Driver Environment first; check runtime privileges, signing policy, both packages/services, both communication paths, and model assets in order |
| The main driver or BootFilter package is missing | Extract the complete release archive again; for source builds, use the main solution with VS/MSBuild instead of building only the managed project |
| A driver fails to load because of signing | Use test signing for development builds only in a recoverable test environment; verify trusted production signatures on the SYS/CAT files for release packages |
| Services are installed but communication fails | Refresh Driver Environment and confirm that both the main driver and BootFilter services are running; repair and retry, then inspect app and driver logs if it still fails |
| A protocol or build mismatch is reported | The app, main driver, and BootFilter must come from the same release package; do not mix in an older `Driver` directory |
| `MSB4278`, `Microsoft.Cpp.Default.props`, Inf2Cat, or SignTool is missing | Install or repair Visual Studio C++, the Windows SDK, and WDK integration, then build with Visual Studio MSBuild |
| Xdows Model cannot be used | Install the [Visual C++ Redistributable v14](https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist?view=msvc-170) and verify that the native model and ONNX Runtime files are complete |
| Windows App SDK or .NET is missing | Official packages are normally self-contained; download the package again if it is damaged, or install the matching [Windows App SDK](https://learn.microsoft.com/windows/apps/windows-app-sdk/downloads) and [.NET](https://dotnet.microsoft.com/download) versions |
| The R3 boot baseline cannot be created | Run the app as administrator, confirm that the system currently boots normally and disk access is not blocked, and create a new baseline only when the current state is trusted |
| R3 registry prompts repeat | Inspect the logs for the actor and rule category, then update all components from the same release package; do not work around the issue by disabling an R0 driver module |

## Safety Validation Boundary {#SafetyBoundary}

Source smokes, protocol mirror checks, and non-destructive build checks do not replace real kernel runtime validation. Destructive scenarios such as physical-disk writes, EFI repair, filter-driver unload, and R0 kernel registry blocking must be accepted only in a disposable, snapshot-backed, recoverable VM. This guide does not claim that those scenarios were runtime-tested on the current host.

## License {#License}

This project is licensed under the MIT License. See [LICENSE](https://github.com/XTY64XTY/Xdows-Security-5/blob/main/LICENSE.txt) for details.
