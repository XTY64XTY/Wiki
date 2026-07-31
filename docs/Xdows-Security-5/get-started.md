---
title: Xdows Security 5
description: Quick start, download, and first run guide for Xdows Security 5.
---

# Getting Started {#GetStarted}

Xdows Security 5 is an open-source Windows security product built with WinUI 3 and C#, released under the MIT License. It provides both user-mode R3 protection and driver-backed R0 protection, and uses the self-developed Xdows Model local model for malicious file detection.

## Download and First Run {#Download}

1. Download the latest `Xdows-Security.zip` from [Releases](https://github.com/XTY64XTY/Xdows-Security-5/releases).
2. Extract the entire archive to a local directory. Do not copy only `Xdows-Security.exe`; the driver packages, BootFilter, and native model assets must keep their original directory structure.
3. Run `Xdows-Security.exe`. Scanning does not always require elevation, but installing, starting, repairing, or stopping the drivers requires administrator rights.
4. To use R0 protection, enable Driver Protection in Settings. The app checks the environment, installs the main driver and BootFilter, and establishes communication.
5. If setup fails, open Driver Environment, apply the repair action for the affected group, and refresh the checks.

<LinkCard url="https://github.com/XTY64XTY/Xdows-Security-5/releases" title="Download Xdows Security 5" description="https://github.com/XTY64XTY/Xdows-Security-5/releases" logo="/logo.ico"/>

:::info
BootFilter is a separate storage filter driver, but it ships in the Xdows Security driver package and starts and stops with Driver Protection as a whole. R0 boot protection and R0 registry protection do not have separate switches.
:::

## Next {#Next}

- [Protection Capabilities](./protection) — Understand R0/R3 protection boundaries, switch policies, and scan engines
- [Driver Environment](./driver-environment) — Four check groups and repair actions
- [Build and Installation](./build) — Build from source and driver installation guide
- [Troubleshooting](./troubleshooting) — Common issues and safety validation boundary

## License {#License}

This project is licensed under the MIT License. See [LICENSE](https://github.com/XTY64XTY/Xdows-Security-5/blob/main/LICENSE.txt) for details.
