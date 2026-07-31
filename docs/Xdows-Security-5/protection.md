---
title: Protection Capabilities
description: R0/R3 protection boundaries, switch policies, failure policies, and scan engines for Xdows Security 5.
---

# Protection Capabilities {#Protection}

Xdows Security provides both user-mode R3 protection and driver-backed R0 protection. They are not independently installed products, and an R3 detection must not be treated as equivalent to a kernel block before an operation completes.

## Protection Layer Boundaries {#Boundaries}

| Protection area | R3 user-mode responsibility | R0 driver responsibility |
|-----------------|-----------------------------|--------------------------|
| Processes and files | Monitor, scan, log, and run compatibility protection workflows in user mode | Submit events and wait for a decision before process creation and file create, write, or rename operations complete |
| High-risk behavior | Provide user-mode detection, logging, and compatibility handling without claiming kernel pre-operation interception | Intercept high-risk command behavior, sensitive handle operations, and injection-related behavior, then route them through the unified user decision flow |
| Boot protection | Create a trusted boot baseline and monitor raw boot structures and active EFI/BCD files; repair differences, then let the user keep the repair or allow the change and update the baseline | Protect EFI/BCD file writes in the main driver; protect raw system-disk boot-region writes in the separate BootFilter and wait for a user-mode decision before completion |
| Registry protection | Observe protected-rule changes through ETW, coalesce duplicate events, identify and scan the actor, log, and ask the user; blocking occurs after detection and is not transaction-level rollback | Use a kernel registry callback to wait for a user decision before create, set-value, delete-value, delete-key, rename, restore, replace, and unload operations complete |
| Self-protection | Manage app state, logs, and user interaction | Restrict dangerous handles and injection prerequisites against the protected process and validate controlled shutdown |

## Switches and Failure Policy {#Switches}

- Driver Protection is the aggregate switch for R0 capabilities. R0 boot protection, R0 registry protection, and BootFilter have no separate switches.
- The Registry master switch and the Secondary Rules and Other Rules settings control only R3 registry protection and its rule categories. They do not independently control the R0 registry module.
- R0 registry and boot operations require a decision from the user-mode bridge. If the bridge is unavailable, the wait expires, or resources are exhausted, protected operations are denied and logged under the conservative policy.
- BootFilter uses its independent protocol v1. The main driver and managed bridge use protocol v9. These protocols are not interchangeable.

## Scan Engines {#ScanEngines}

| Name | Description | Open source |
|------|-------------|-------------|
| Xdows Local | Analyzes PE files using static features such as import and export tables | Fully open source |
| Xdows Model | Uses ONNX models for detection and supports Standard, Flash, Pro, and Adaptive modes | Fully open source |
| Cloud-based Scan Engine | Cloud scanning service provided by `MEMZUAC` | Closed source |

For details on the Xdows Model architecture, feature contracts, and training pipeline, see the [Xdows Model documentation](../Xdows-Model/get-started).

Xdows Tools is the product's built-in toolset. The product name is always written as `Xdows Tools`.
