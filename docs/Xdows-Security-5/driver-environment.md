---
title: Driver Environment
description: The four check groups, repair actions, and test-signing guidance for Xdows Security 5 Driver Environment.
---

# Driver Environment {#DriverEnvironment}

Driver Environment combines status into four groups. The main driver and BootFilter report separate status within the same group, but this does not mean they can be enabled separately.

## Check Groups {#Groups}

| Check group | What it checks | Typical action |
|-------------|----------------|----------------|
| Runtime privileges | Whether the current process has administrator rights | Restart Xdows Security as administrator |
| Driver signing and system policy | Development test-signing state, plus the driver package's current release scope | Use a recoverable test machine for development; the current release scope is development and test-machine signing, and does not include production EV, attestation, or HLK signing flows |
| Both driver packages and services | The INF, SYS, and CAT packages and services for the main driver and BootFilter | Keep the full release directory and use the per-group repair action to reinstall or start components |
| Both driver communication paths and model assets | Main-driver communication, BootFilter communication, and native model assets | Start services, repair the packages, or rebuild the complete solution output |

## Repair Actions {#Repair}

After a repair action completes, Driver Environment checks the affected state again. A signing warning does not necessarily mean that a properly signed release driver is unavailable: a system-trusted production signature does not depend on test-signing mode.

## Manual Inspection {#Inspection}

The app installs and starts the drivers itself, but the same state can be inspected from an elevated PowerShell session on a test machine:

```powershell
sc query Xdows-Security-Driver
pnputil /enum-drivers | findstr /i Xdows
```

The expected driver package directory from a source build is:

```text
D:\Code\Xdows-Security-Driver\x64\Debug\Xdows-Security-Driver
```

containing `Xdows-Security-Driver.inf`, `Xdows-Security-Driver.sys`, and `xdows-security-driver.cat`. For first-time installs, prefer the app flow so the `Root\XdowsSecurityDriver` root device is created before the package is bound; `pnputil /add-driver ... /install` followed by `sc start Xdows-Security-Driver` is intended for upgrade or diagnosis after that device exists.

:::caution
Test signing is for development and testing only. Do not enable test-signing mode as a production deployment strategy. On a development machine it is enabled with `bcdedit /set testsigning on` followed by a reboot, and only on a disposable VM or a recoverable test machine.
:::
