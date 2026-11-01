---
title: Protection Capabilities
description: R0/R3 protection boundaries, switch policies, failure policies, declarative behavior rules, and scan engines for Xdows Security 5.
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

For the kernel side in detail — protocol version, IOCTL map, capability bits, behavior types, and the protection modules — see [Kernel Driver Architecture](./driver/architecture).

## Switches and Failure Policy {#Switches}

- Driver Protection is the aggregate switch for R0 capabilities. R0 boot protection, R0 registry protection, and BootFilter have no separate switches.
- The Registry master switch and the Secondary Rules and Other Rules settings control only R3 registry protection and its rule categories. They do not independently control the R0 registry module.
- R0 registry and boot operations require a decision from the user-mode bridge. If the bridge is unavailable, the wait expires, or resources are exhausted, protected operations are denied and logged under the conservative policy.
- BootFilter uses its independent protocol v1. The main driver and managed bridge use protocol v9. These protocols are not interchangeable.

### Declarative Behavior Rules {#DeclarativeRules}

Beyond the fixed in-kernel rules, the driver exposes an interpreter (capability `0x1000`) that lets the app author behavior rules without a driver rebuild. A rule constrains an Initiator × CommandLine × Target tuple, optionally scoped to specific operations and optionally rate-limited. The rule set lives in `Config\BehaviorRules.json` and is pushed with `IOCTL_XDOWS_SECURITY_SET_BEHAVIOR_RULES` (0x811).

Fail-open / fail-closed is a **per-rule property**: on infrastructure failure a rule without `FAIL_CLOSED` releases the operation and logs it, while a rule with the flag denies with `STATUS_ACCESS_DENIED`. The fixed in-kernel rules are always evaluated first, so a declarative rule can only add coverage and never weakens a built-in denial.

### Initiator Exclusions {#InitiatorExclusions}

The initiator exclusion list (capability `0x2000`, `IOCTL_XDOWS_SECURITY_SET_INITIATOR_EXCLUSIONS` 0x812) suppresses the user-mode prompt for known-good actors across the process, file, handle, and registry scopes. Exclusions are evaluated **after** every critical gate — after sensitive-handle rights stripping, after the CI-trust gate, and after the built-in file denials and autorun rule — so an over-broad list degrades noise, never protection. They also never bypass a confirmed-threat command-line rule.

## Scan Engines {#ScanEngines}

| Name | Description | Open source |
|------|-------------|-------------|
| Xdows Local | Analyzes PE files using static features such as import and export tables | Fully open source |
| Xdows Model | Uses ONNX models for detection and supports Standard, Flash, Pro, and Adaptive modes | Fully open source |
| SevenEngine | Cloud hash lookup service | Closed source |

The app sends only the file's MD5 hash to [SevenEngine](https://sevenengine-cloud.onrender.com/docs); it does not upload file content. If the service has not cached the hash, the cloud scan returns no verdict.

The settings page checks `/api/health`. When the service reports healthy, the engine card shows the engine name, feature dimension, decision threshold, and uptime; a failed or unhealthy check keeps the warning that the engine may no longer be supported.

Xdows Model reports a three-tier verdict — `Clean`, `Suspicious`, or `Malware` — where the `Suspicious` band starts at the model's recommended threshold and `Malware` starts at its fixed threshold. The managed Invoker and the native runtime both honour the same threshold manifests, and both refuse to load a Pro model whose manifest does not match the compiled feature layout, so a partially deployed model set fails loudly instead of scoring with the wrong feature layout.

For details on the Xdows Model architecture, feature contracts, and training pipeline, see the [Xdows Model documentation](../Xdows-Model/get-started). A secure Rust binding to the same native inference is documented under [Rust Invoker](../Xdows-Model/rust-invoker).

Xdows Tools is the product's built-in toolset. The product name is always written as `Xdows Tools`.
