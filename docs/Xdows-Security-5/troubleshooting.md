---
title: Troubleshooting
description: Common issues, troubleshooting table, and safety validation boundary for Xdows Security 5.
---

# Troubleshooting {#Troubleshooting}

## Common Issues {#FAQ}

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
