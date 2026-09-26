---
title: Kernel Driver Architecture
description: The Xdows Security kernel components, protocol v9, the IOCTL map, capability bits, behavior types, declarative behavior rules, initiator exclusions, and the protection modules.
---

# Kernel Driver Architecture {#Driver}

The R0 side of Xdows Security is delivered by the `Xdows-Security-Driver` repository. It contains two kernel components that ship in the same driver package and start and stop together with Driver Protection:

| Component | Type | Role |
| --- | --- | --- |
| `Xdows-Security-Driver` | KMDF minifilter on FltMgr | Produces process, file, handle, behavior, boot, and registry events; holds protected operations until user mode decides |
| `Xdows-Security-BootFilter` | Separate WDM storage filter | Protects raw system-disk boot-region writes |

The main driver is registered as a file-system driver with `StartType = DEMAND_START` in the `FSFilter Activity Monitor` load-order group, depends on `FltMgr`, and uses the altitude `370030`.

## Ownership Boundary {#Boundary}

The driver repository owns `Public.h` — the protocol constants, IOCTLs, event/decision/state/authorization/process/log structures — as well as kernel event production, the pending queue and timeout behaviour, token hashing, self-protection, injection protection, and log buffering.

The main app repository mirrors `Public.h` in `Protection\DriverProtocol.cs`, owns the bridge in `Protection\DriverBridgeClient.cs` and the policy in `Protection\DriverProtection.cs`, and installs the package through `DriverInstaller` / `DriverPackageInstaller`. The model repository owns the `Xdows-Model-Native.dll` C ABI, the ONNX Runtime dependencies, and the ONNX model files; the driver itself never loads a model.

Any change to `Public.h` that alters a struct layout, enum value, IOCTL code, string buffer length, token length, or device path must update `DriverProtocol.cs`, `DriverBridgeClient.cs` when IOCTL behaviour changed, `DriverProtection.cs` when event or decision semantics changed, and the usage documentation in the same change.

## Protocol Version {#Protocol}

The current main-driver protocol version is **9**. BootFilter uses its own independent protocol **v1**. The two are not interchangeable.

Protocol 7 added the `Behavior` event, the shared `BehaviorType` payload, per-type state counters, and the R0 behavior module and capability bits. Protocol 9 added `SetBootProtection` (0x80E), `SetRegistryProtection` (0x80F), the `RegistryWrite` event (type 11), capability bit `0x200`, and module bit `0x40`.

Every later addition stayed on protocol 9 as a purely additive block, so an older app build keeps working against a newer driver and vice versa. New enum values are appended; existing values are never reused for a new meaning.

## IOCTL Map {#IOCTL}

| IOCTL | Function | Purpose |
| --- | --- | --- |
| `IOCTL_XDOWS_SECURITY_REGISTER_CLIENT` | `0x801` | Register the app bridge and return the privileged authorization token once |
| `IOCTL_XDOWS_SECURITY_HEARTBEAT` | `0x802` | Keep bridge liveness fresh |
| `IOCTL_XDOWS_SECURITY_GET_NEXT_EVENT` | `0x803` | Pull one pending protection event |
| `IOCTL_XDOWS_SECURITY_SUBMIT_DECISION` | `0x804` | Return Allow, Block, or Timeout for an event |
| `IOCTL_XDOWS_SECURITY_GET_STATE` | `0x805` | Query bridge and queue state |
| `IOCTL_XDOWS_SECURITY_DISCONNECT_CLIENT` | `0x806` | Explicit bridge disconnect |
| `IOCTL_XDOWS_SECURITY_REGISTER_PROTECTED_PROCESS` | `0x807` | Register the main app process for self-protection |
| `IOCTL_XDOWS_SECURITY_SET_VOLUNTARY_EXIT` | `0x808` | Tell the driver the app is intentionally exiting |
| `IOCTL_XDOWS_SECURITY_AUTHORIZED_SHUTDOWN` | `0x809` | Stop protection with the one-time shutdown token |
| `IOCTL_XDOWS_SECURITY_GET_NEXT_LOG` | `0x80A` | Pull one buffered driver log entry |
| `IOCTL_XDOWS_SECURITY_SET_STARTUP_PROTECTION` | `0x80B` | Synchronize startup-entry self-protection |
| `IOCTL_XDOWS_SECURITY_QUERY_PROCESSES` | `0x80C` | Token-authorized, paged kernel process snapshot |
| `IOCTL_XDOWS_SECURITY_OPERATE_PROCESS` | `0x80D` | Suspend, resume, or terminate a process after protected-client and token validation |
| `IOCTL_XDOWS_SECURITY_SET_BOOT_PROTECTION` | `0x80E` | Configure EFI and BCD boot protection |
| `IOCTL_XDOWS_SECURITY_SET_REGISTRY_PROTECTION` | `0x80F` | Configure R0 registry protection rules |
| `IOCTL_XDOWS_SECURITY_GET_NEXT_EVENTS` | `0x810` | Drain up to 16 undelivered events in one non-blocking call |
| `IOCTL_XDOWS_SECURITY_SET_BEHAVIOR_RULES` | `0x811` | Replace the declarative behavior rule set (capability `0x1000`) |
| `IOCTL_XDOWS_SECURITY_SET_INITIATOR_EXCLUSIONS` | `0x812` | Replace the initiator exclusion list (capability `0x2000`) |

Process management requests require both the registered, self-protected main process identity and the authorization token issued during registration. The driver rejects PID 0, PID 4, the calling main process, the protected process, and critical processes.

## Capability and Module Bits {#Capabilities}

Capabilities are reported by the driver so the app can degrade gracefully instead of issuing an unsupported downcall:

| Capability | Value | Meaning |
| --- | --- | --- |
| `CAP_PRIORITY_QUEUE` | `0x1` | Priority event queue |
| `CAP_DIRTY_WRITE_COALESCING` | `0x2` | Coalesce duplicate dirty writes |
| `CAP_BUILD_ID` | `0x4` | Drivers report a build id |
| `CAP_STARTUP_SELF_PROTECT` | `0x8` | Startup-entry self-protection |
| `CAP_USER_DECISION_HOLD` | `0x10` | Hold an operation for a user decision |
| `CAP_PROCESS_MANAGEMENT` | `0x20` | Kernel process management |
| `CAP_ENHANCED_SELF_PROTECT` | `0x40` | Enhanced self-protection |
| `CAP_R0_BEHAVIOR_PROTECTION` | `0x80` | R0 behavior module |
| `CAP_R0_BOOT_PROTECTION` | `0x100` | R0 boot protection |
| `CAP_R0_REGISTRY_PROTECTION` | `0x200` | R0 registry protection |
| `CAP_ASYNC_REVIEW` | `0x400` | Non-critical events may be reviewed asynchronously |
| `CAP_EVENT_BATCH` | `0x800` | Batch event drain |
| `CAP_RULE_INTERPRETER` | `0x1000` | Declarative behavior rule interpreter |
| `CAP_INITIATOR_EXCLUSION` | `0x2000` | Initiator exclusion list |

Module bits report which protection modules are live: TokenAuth `0x1`, Process `0x2`, File `0x4`, Injection `0x8`, SelfProtect `0x10`, Behavior `0x20`, Registry `0x40`.

## Events and Behavior Types {#BehaviorTypes}

`Behavior` events always carry a `ThreatConfirmed` flag and enter the user-decision hold before any path resolution or UI work. The behavior type values are:

| Value | Name | Notes |
| --- | --- | --- |
| 0 | `None` | |
| 1 | `VssDeletion` | Shadow-copy destruction |
| 2 | `HiddenPowerShell` | |
| 3 | `EncodedCommand` | |
| 4 | `PolicyBypass` | Fail-open on infrastructure failure |
| 5 | `DownloadExecute` | |
| 6 | `LolbinAbuse` | |
| 7 | `ProcessInjection` | Correlates dangerous process handle requests |
| 8 | `ThreadInjection` | Correlates dangerous thread handle requests |
| 9 | `ParentProcessChain` | |
| 10 | `AutorunInf` | |
| 11 | `ProtectedProcessTerminate` | |
| 12 | `SensitiveProcessHandle` | |
| 13 | `DestructiveDirectoryDelete` | Fail-open on infrastructure failure |
| 14 | `OwnershipEscalation` | Fail-open on infrastructure failure |
| 15 | `SystemControlCommand` | Fail-open on infrastructure failure |
| 16 | `EfiMount` | `mountvol` + `/s`; **fail-closed** |
| 17 | `OobeReset` | `sysprep` + `/oobe` / `/generalize` / `/audit`; **fail-closed** |
| 18 | `SystemDirectoryRansomware` | Reserved: enforced purely in kernel, never reaches user mode |

## Decision Semantics {#Decisions}

- `Allow`: continue the original operation.
- `Block`: deny the original operation.
- `Timeout`: the user-mode decision timed out; a confirmed threat maps to deny behaviour.

When the bridge or the model fails **before** a threat is confirmed, user mode allows and logs the failure. High-confidence command rules keep their kernel fail-closed behaviour, policy bypass stays fail-open, and injection keeps its existing fail-open infrastructure policy. When a threat is confirmed and the user refuses or times out, the decision is Block or Timeout.

## Declarative Behavior Rules {#BehaviorRules}

Capability `0x1000` adds a user-mode-authored rule interpreter, so new behavior coverage no longer requires a driver rebuild. A rule is the tuple **Initiator × CommandLine × Target**:

| Field | Meaning |
| --- | --- |
| `RuleId`, `BehaviorType` | Both must be non-zero |
| `Operations` | Mask of `PROCESS_CREATE 0x1`, `FILE_CREATE 0x2`, `FILE_WRITE 0x4`, `FILE_DELETE 0x8`, `FILE_RENAME 0x10`, `ALL 0x1F` |
| `Threshold` / `WindowMs` | Optional rate limit: `0` fires on every match; otherwise the same process must match `Threshold` times within `WindowMs` (clamped to 60000) |
| `TargetMatchKind` | `Any 0`, `Suffix 1`, `Segment 2`, `Prefix 3`, `Contains 4` |
| `Flags` | `KILL_ACTOR 0x1`, `FAIL_CLOSED 0x2` |
| `Initiator` / `Target` / `CommandLine` | Term axes, each holding up to 3 terms of 96 wide chars, NUL included |

Axis semantics: `TermCount == 0` leaves the axis unconstrained. An Initiator term is an image leaf name (`cmd.exe`) or, when it contains a backslash, a case-insensitive actor-path suffix. Every CommandLine term must appear as a substring. Target terms are interpreted with the rule's `TargetMatchKind`, and the rule matches when **any** target term matches. A rule that constrains no axis at all is rejected.

A whole request is validated before anything is applied and is rejected as a unit, so a malformed rule can never leave a partially applied set: `TargetMatchKind` must be in range, `Operations` must be non-zero and inside the supported mask, `Flags` must contain only known bits, `Threshold` must be `0..10000`, and every term must be non-empty, NUL-terminated inside its fixed buffer, and free of literal `*` / `?` wildcards — the interpreter only does literal matching, so a wildcard term would silently never match and hide a configuration mistake. A rejected request returns `STATUS_INVALID_PARAMETER` and leaves the previous set untouched. The swap happens under the exclusive side of an `EX_PUSH_LOCK` that the evaluation path holds shared.

Fail-open / fail-closed is a **per-rule property** rather than a per-rule-id hard-coded list: on infrastructure failure a rule without `FAIL_CLOSED` releases the operation and logs it, and a rule with it denies with `STATUS_ACCESS_DENIED`. `KILL_ACTOR` escalates a confirmed Block to a counter-kill of the acting process, sharing the injection guard rails (never the registered client, a critical system process, a self-protected process, or PID ≤ 4). A rate-limited rule is tracked in a fixed 32-slot sliding window keyed by (rule id, process id).

The fixed in-kernel rules are always evaluated **before** the declarative set, so their fail-open / fail-closed classification is unchanged and the declarative set can only add coverage, never weaken a built-in denial. The limit is 32 rules.

## Initiator Exclusions {#InitiatorExclusions}

Capability `0x2000` lets the app suppress the user-mode consultation for known-good actors: up to 32 entries of 160 wide chars, each with a `ScopeMask` of `Process 0x1`, `File 0x2`, `Handle 0x4`, `Registry 0x8` (`ALL 0xF`). A pattern is an image leaf name (`steam.exe`) or, when it contains a backslash, a case-insensitive actor-path suffix. `Count = 0` clears the list.

Exclusions are deliberately evaluated **after** every critical gate, so an over-broad list can only reduce noise, never protection:

- the handle gate only after the sensitive-process rights-stripping gate;
- the registry gate only after the CI-trust gate;
- the file gate only after the built-in denials and the autorun rule;
- the process gate only after the fixed kernel command-line rules.

They also never bypass a confirmed-threat command-line rule. Because the hot-path gates resolve only the requestor image leaf name without materializing an actor path, a **path-suffix** pattern applies to the `Process` scope only; on the `File`, `Handle`, and `Registry` scopes it simply does not match. Author exclusions as leaf names unless only the process gate is being targeted.

The rule set is authored in the app as `Config\BehaviorRules.json` and parsed by `DriverBehaviorRuleCatalog`. A missing file is a valid "no rules" state, while a malformed file is reported and skipped instead of aborting the attach sequence.

## Protection Modules {#Modules}

| Area | Kernel behaviour |
| --- | --- |
| File | System-binary masquerade interception in `PreCreate`: a write-open that creates or replaces a system binary name (`svchost.exe`, `rundll32.exe`, `regsvr32.exe`, `dllhost.exe`, `lsass.exe`, `csrss.exe`, `smss.exe`, `winlogon.exe`, `wininit.exe`, `services.exe`, `spoolsv.exe`, `taskhostw.exe`, `conhost.exe`, `dwm.exe`, `dllhst3g.exe`) under `AppData`, `Downloads`, `Desktop` (including OneDrive-redirected desktops), or `ProgramData` is denied synchronously with `STATUS_ACCESS_DENIED` — no event, no user-mode round trip. CI-trusted processes and the registered client are exempt. |
| Ransomware | `RansomwareMonitor` counts destructive opens in two dimensions. User data: `XDOWS_RANSOM_FILE_THRESHOLD` (10) document/media writes in `XDOWS_RANSOM_WINDOW_MS` (3000). System directories: destructive opens by script hosts (`cmd`, `powershell`, `pwsh`, `wscript`, `cscript`, `mshta`, `rundll32`, `regsvr32`) under any `\Windows\` subtree cross `XDOWS_RANSOM_SYS_FILE_THRESHOLD` (50) within `XDOWS_RANSOM_SYS_WINDOW_MS` (3000) in a separate slot table, after which further opens are denied with `STATUS_VIRUS_INFECTED`. The CI-trust gate is deliberately not applied to the system dimension, because the interpreter binary is always legitimately signed — the script-host identity is the discriminator. |
| Registry | A kernel registry callback holds create, set-value, delete-value, delete-key, rename, restore, replace, and unload operations for a user decision. The rule-path budget is `XDOWS_SECURITY_MAX_REGISTRY_RULES` (32); the app deploys 26 rules under `Recommended`. On a confirmed Block for a critical persistence key the gate honours the `KillActor` sentinel (`0x4B494C4C`) and counter-kills the actor through the shared injection guard rails. |
| Injection | `ObRegisterCallbacks` strips dangerous handle rights and always reports `ProcessInjection` / `ThreadInjection` events; the counter-kill primitive is shared with the behavior and registry gates. |
| Self-protection | Restricts dangerous handles and injection prerequisites against the protected process, and validates controlled shutdown through the one-time token. |
| Boot | The main driver protects EFI/BCD writes; BootFilter protects raw system-disk boot-region writes and waits for a user-mode decision before completion. |

## Communication Robustness {#Robustness}

`IOCTL_XDOWS_SECURITY_GET_NEXT_EVENTS` drains up to 16 events in one call and never blocks; the client paces its own loop and reads only `Count` entries. The batch struct is kept under the 85 KB .NET LOH threshold so the app can pool its buffers. `XDOWS_SECURITY_REGISTER_FLAG_ASYNC_REVIEW` queues non-critical event types for display while the origin thread returns immediately with the default Allow decision — `FileRename` is excluded, because it runs in `PreSetInformation`, can fail the operation with `STATUS_VIRUS_INFECTED`, and must stay synchronous so user mode can still block ransomware-style renames.

Per-type sliding-window (1 s) rate limits throttle non-critical noise types (file create 200/s, file write 300/s, driver log 100/s). Throttled events are dropped silently and counted in `DroppedByType`. Critical types — process create, file rename, handle and thread operations, confirmed behavior, boot writes, and registry writes — are never throttled.

## Build and Installation {#Build}

The driver projects are WDK `.vcxproj` projects and require Visual Studio C++ MSBuild with WDK integration; the `dotnet` CLI alone cannot build them. See [Build and Installation](../build) for the toolchain, the build command, and the installation flow.

## License {#License}

This project uses the MIT license; see [LICENSE](https://github.com/XTY64XTY/Xdows-Security-Driver/blob/master/LICENSE) for details.
