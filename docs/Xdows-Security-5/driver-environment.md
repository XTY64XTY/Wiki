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
| Driver signing and system policy | Development test-signing state plus guidance for production signing and system policy | Use a recoverable test machine for development; use a trusted production signature for releases |
| Both driver packages and services | The INF, SYS, and CAT packages and services for the main driver and BootFilter | Keep the full release directory and use the per-group repair action to reinstall or start components |
| Both driver communication paths and model assets | Main-driver communication, BootFilter communication, and native model assets | Start services, repair the packages, or rebuild the complete solution output |

## Repair Actions {#Repair}

After a repair action completes, Driver Environment checks the affected state again. A signing warning does not necessarily mean that a properly signed release driver is unavailable: a system-trusted production signature does not depend on test-signing mode.

:::caution
Test signing is for development and testing only. Do not enable test-signing mode as a production deployment strategy. Public releases require a production driver signature trusted by Windows.
:::
