---
title: 内核驱动架构
description: Xdows Security 的内核组件、协议 v9、IOCTL 映射、能力位、行为类型、声明式行为规则、发起者排除清单和防护模块。
---

# 内核驱动架构 {#Driver}

Xdows Security 的 R0 侧由 `Xdows-Security-Driver` 仓库交付。它包含两个内核组件，它们随同一驱动包一同发布，并随“驱动防护”整体启停：

| 组件 | 类型 | 作用 |
| --- | --- | --- |
| `Xdows-Security-Driver` | 基于 FltMgr 的 KMDF 微过滤器 | 产生进程、文件、句柄、行为、引导和注册表事件；在用户态决策前挂起受保护操作 |
| `Xdows-Security-BootFilter` | 独立的 WDM 存储过滤器 | 保护系统盘原始引导区域写入 |

主驱动以文件系统驱动注册，`StartType = DEMAND_START`，位于 `FSFilter Activity Monitor` 加载顺序组，依赖 `FltMgr`，使用的 altitude 为 `370030`。

## 职责边界 {#Boundary}

驱动仓库负责 `Public.h`——协议常量、IOCTL、事件/决策/状态/授权/进程/日志结构——以及内核事件产生、挂起队列与超时行为、令牌哈希、自我防护、注入防护和日志缓冲。

主程序仓库在 `Protection\DriverProtocol.cs` 中镜像 `Public.h`，在 `Protection\DriverBridgeClient.cs` 中实现桥接、在 `Protection\DriverProtection.cs` 中实现策略，并通过 `DriverInstaller` / `DriverPackageInstaller` 安装驱动包。模型仓库负责 `Xdows-Model-Native.dll` 的 C ABI、ONNX Runtime 依赖和 ONNX 模型文件；驱动本身从不加载模型。

任何对 `Public.h` 的修改，只要改变了结构体布局、枚举值、IOCTL 码、字符串缓冲区长度、令牌长度或设备路径，就必须在同一次变更中同步更新 `DriverProtocol.cs`；当 IOCTL 行为变化时更新 `DriverBridgeClient.cs`；当事件或决策语义变化时更新 `DriverProtection.cs`；以及更新使用文档。

## 协议版本 {#Protocol}

当前主驱动协议版本为 **9**。BootFilter 使用它自己的独立协议 **v1**。两者不能混用。

协议 7 增加了 `Behavior` 事件、共享的 `BehaviorType` 载荷、按类型的状态计数器，以及 R0 行为模块和能力位。协议 9 增加了 `SetBootProtection`（0x80E）、`SetRegistryProtection`（0x80F）、`RegistryWrite` 事件（类型 11）、能力位 `0x200` 和模块位 `0x40`。

此后所有新增都以纯追加的方式留在协议 9 上，因此较旧的应用构建可以继续配合较新的驱动工作，反之亦然。新的枚举值一律追加；已有值绝不会被复用于新含义。

## IOCTL 映射 {#IOCTL}

| IOCTL | 功能 | 用途 |
| --- | --- | --- |
| `IOCTL_XDOWS_SECURITY_REGISTER_CLIENT` | `0x801` | 注册应用桥接并一次性返回特权授权令牌 |
| `IOCTL_XDOWS_SECURITY_HEARTBEAT` | `0x802` | 保持桥接活跃状态新鲜 |
| `IOCTL_XDOWS_SECURITY_GET_NEXT_EVENT` | `0x803` | 拉取一个挂起的防护事件 |
| `IOCTL_XDOWS_SECURITY_SUBMIT_DECISION` | `0x804` | 为某个事件返回 Allow、Block 或 Timeout |
| `IOCTL_XDOWS_SECURITY_GET_STATE` | `0x805` | 查询桥接与队列状态 |
| `IOCTL_XDOWS_SECURITY_DISCONNECT_CLIENT` | `0x806` | 显式断开桥接 |
| `IOCTL_XDOWS_SECURITY_REGISTER_PROTECTED_PROCESS` | `0x807` | 为自我防护注册主程序进程 |
| `IOCTL_XDOWS_SECURITY_SET_VOLUNTARY_EXIT` | `0x808` | 告知驱动应用正在有意退出 |
| `IOCTL_XDOWS_SECURITY_AUTHORIZED_SHUTDOWN` | `0x809` | 使用一次性关闭令牌停止防护 |
| `IOCTL_XDOWS_SECURITY_GET_NEXT_LOG` | `0x80A` | 拉取一条已缓冲的驱动日志 |
| `IOCTL_XDOWS_SECURITY_SET_STARTUP_PROTECTION` | `0x80B` | 同步启动项自我防护 |
| `IOCTL_XDOWS_SECURITY_QUERY_PROCESSES` | `0x80C` | 经令牌授权、分页的内核进程快照 |
| `IOCTL_XDOWS_SECURITY_OPERATE_PROCESS` | `0x80D` | 在校验受保护客户端和令牌后挂起、恢复或终止进程 |
| `IOCTL_XDOWS_SECURITY_SET_BOOT_PROTECTION` | `0x80E` | 配置 EFI 与 BCD 引导防护 |
| `IOCTL_XDOWS_SECURITY_SET_REGISTRY_PROTECTION` | `0x80F` | 配置 R0 注册表防护规则 |
| `IOCTL_XDOWS_SECURITY_GET_NEXT_EVENTS` | `0x810` | 在一次非阻塞调用中最多取走 16 个未投递事件 |
| `IOCTL_XDOWS_SECURITY_SET_BEHAVIOR_RULES` | `0x811` | 替换声明式行为规则集（能力位 `0x1000`） |
| `IOCTL_XDOWS_SECURITY_SET_INITIATOR_EXCLUSIONS` | `0x812` | 替换发起者排除清单（能力位 `0x2000`） |

进程管理请求同时需要已注册、受自我防护的主进程身份，以及注册时签发的授权令牌。驱动会拒绝 PID 0、PID 4、发起调用的主进程、受保护进程和关键进程。

## 能力位与模块位 {#Capabilities}

驱动会上报能力位，使应用可以优雅降级，而不是发起不受支持的下行调用：

| 能力 | 值 | 含义 |
| --- | --- | --- |
| `CAP_PRIORITY_QUEUE` | `0x1` | 优先事件队列 |
| `CAP_DIRTY_WRITE_COALESCING` | `0x2` | 合并重复的脏写入 |
| `CAP_BUILD_ID` | `0x4` | 驱动上报构建 ID |
| `CAP_STARTUP_SELF_PROTECT` | `0x8` | 启动项自我防护 |
| `CAP_USER_DECISION_HOLD` | `0x10` | 为等待用户决策而挂起操作 |
| `CAP_PROCESS_MANAGEMENT` | `0x20` | 内核进程管理 |
| `CAP_ENHANCED_SELF_PROTECT` | `0x40` | 增强自我防护 |
| `CAP_R0_BEHAVIOR_PROTECTION` | `0x80` | R0 行为模块 |
| `CAP_R0_BOOT_PROTECTION` | `0x100` | R0 引导防护 |
| `CAP_R0_REGISTRY_PROTECTION` | `0x200` | R0 注册表防护 |
| `CAP_ASYNC_REVIEW` | `0x400` | 非关键事件可异步审阅 |
| `CAP_EVENT_BATCH` | `0x800` | 批量取走事件 |
| `CAP_RULE_INTERPRETER` | `0x1000` | 声明式行为规则解释器 |
| `CAP_INITIATOR_EXCLUSION` | `0x2000` | 发起者排除清单 |

模块位上报哪些防护模块处于活动状态：TokenAuth `0x1`、Process `0x2`、File `0x4`、Injection `0x8`、SelfProtect `0x10`、Behavior `0x20`、Registry `0x40`。

## 事件与行为类型 {#BehaviorTypes}

`Behavior` 事件始终携带 `ThreatConfirmed` 标志，并在任何路径解析或 UI 工作之前进入用户决策挂起。行为类型值如下：

| 值 | 名称 | 说明 |
| --- | --- | --- |
| 0 | `None` | |
| 1 | `VssDeletion` | 卷影副本破坏 |
| 2 | `HiddenPowerShell` | |
| 3 | `EncodedCommand` | |
| 4 | `PolicyBypass` | 基础设施故障时放行（fail-open） |
| 5 | `DownloadExecute` | |
| 6 | `LolbinAbuse` | |
| 7 | `ProcessInjection` | 关联危险的进程句柄请求 |
| 8 | `ThreadInjection` | 关联危险的线程句柄请求 |
| 9 | `ParentProcessChain` | |
| 10 | `AutorunInf` | |
| 11 | `ProtectedProcessTerminate` | |
| 12 | `SensitiveProcessHandle` | |
| 13 | `DestructiveDirectoryDelete` | 基础设施故障时放行（fail-open） |
| 14 | `OwnershipEscalation` | 基础设施故障时放行（fail-open） |
| 15 | `SystemControlCommand` | 基础设施故障时放行（fail-open） |
| 16 | `EfiMount` | `mountvol` + `/s`；**拒绝（fail-closed）** |
| 17 | `OobeReset` | `sysprep` + `/oobe` / `/generalize` / `/audit`；**拒绝（fail-closed）** |
| 18 | `SystemDirectoryRansomware` | 保留：完全在内核中强制执行，绝不进入用户态 |

## 决策语义 {#Decisions}

- `Allow`：继续原始操作。
- `Block`：拒绝原始操作。
- `Timeout`：用户态决策超时；已确认的威胁映射为拒绝行为。

当桥接或模型在威胁被确认**之前**失败时，用户态放行并记录该失败。高置信度的命令规则保持其内核中的拒绝（fail-closed）行为，策略绕过保持放行（fail-open），注入保持其既有的放行（fail-open）基础设施策略。当威胁被确认且用户拒绝或超时时，决策为 Block 或 Timeout。

## 声明式行为规则 {#BehaviorRules}

能力位 `0x1000` 增加了用户态编写的规则解释器，因此扩展新的行为覆盖面不再需要重新构建驱动。一条规则是 **Initiator × CommandLine × Target** 三元组：

| 字段 | 含义 |
| --- | --- |
| `RuleId`、`BehaviorType` | 两者都必须非零 |
| `Operations` | `PROCESS_CREATE 0x1`、`FILE_CREATE 0x2`、`FILE_WRITE 0x4`、`FILE_DELETE 0x8`、`FILE_RENAME 0x10`、`ALL 0x1F` 的掩码 |
| `Threshold` / `WindowMs` | 可选限速：`0` 表示每次匹配都触发；否则同一进程必须在 `WindowMs`（上限 60000）内匹配 `Threshold` 次 |
| `TargetMatchKind` | `Any 0`、`Suffix 1`、`Segment 2`、`Prefix 3`、`Contains 4` |
| `Flags` | `KILL_ACTOR 0x1`、`FAIL_CLOSED 0x2` |
| `Initiator` / `Target` / `CommandLine` | 词项轴，每个轴最多容纳 3 个词项，每项 96 个宽字符（含 NUL） |

轴语义：`TermCount == 0` 表示该轴不受约束。Initiator 词项是映像叶子名（`cmd.exe`），或者当它包含反斜杠时，是不区分大小写的发起者路径后缀。每个 CommandLine 词项都必须作为子串出现。Target 词项按规则的 `TargetMatchKind` 解释，只要**任意**一个目标词项匹配，规则即匹配。完全不约束任何轴的规则会被拒绝。

整个请求在应用任何内容之前先整体校验，并以整体为单位拒绝，因此格式错误的规则绝不会留下部分应用的结果：`TargetMatchKind` 必须在范围内，`Operations` 必须非零且位于受支持的掩码内，`Flags` 只能包含已知位，`Threshold` 必须为 `0..10000`，每个词项必须非空、在其固定缓冲区内以 NUL 结尾，且不含字面量 `*` / `?` 通配符——解释器只做字面量匹配，通配符词项会静默永不匹配，从而掩盖配置错误。被拒绝的请求返回 `STATUS_INVALID_PARAMETER`，且不触碰之前的规则集。替换发生在 `EX_PUSH_LOCK` 的独占侧，而评估路径以共享方式持有该锁。

放行 / 拒绝（fail-open / fail-closed）是**逐规则属性**，而不是按规则 ID 写死的列表：基础设施故障时，未带 `FAIL_CLOSED` 的规则会放行该操作并记录，带该标志的规则则用 `STATUS_ACCESS_DENIED` 拒绝。`KILL_ACTOR` 会把已确认的 Block 升级为对行为进程的反杀，并共用注入防护的护栏（绝不会是已注册客户端、关键系统进程、受自我防护进程或 PID ≤ 4）。限速规则以 (规则 ID, 进程 ID) 为键，在一个固定的 32 槽滑动窗口中跟踪。

固定的内核内规则始终在声明式规则集**之前**评估，因此它们的放行 / 拒绝（fail-open / fail-closed）分类保持不变，声明式规则集只能增加覆盖面，绝不会削弱内置拒绝。上限为 32 条规则。

## 发起者排除清单 {#InitiatorExclusions}

能力位 `0x2000` 让应用可以抑制对已知良好发起者的用户态咨询：最多 32 个条目，每个 160 个宽字符，各带一个 `ScopeMask`，取值为 `Process 0x1`、`File 0x2`、`Handle 0x4`、`Registry 0x8`（`ALL 0xF`）。模式是映像叶子名（`steam.exe`），或者当它包含反斜杠时，是不区分大小写的发起者路径后缀。`Count = 0` 会清空清单。

排除项被刻意安排在**所有**关键闸门**之后**评估，因此过宽的清单只会减少噪声，绝不会削弱防护：

- 句柄闸门仅在敏感进程权限剥离闸门之后；
- 注册表闸门仅在 CI 信任闸门之后；
- 文件闸门仅在内置拒绝和自动运行规则之后；
- 进程闸门仅在固定的内核命令行规则之后。

它们也绝不会绕过已确认威胁的命令行规则。由于热路径闸门只解析请求方映像叶子名，而不构造完整的发起者路径，**路径后缀**模式只对 `Process` 范围生效；在 `File`、`Handle` 和 `Registry` 范围上根本不会匹配。除只针对进程闸门外，编写排除项时请使用叶子名。

规则集在应用中以 `Config\BehaviorRules.json` 编写，并由 `DriverBehaviorRuleCatalog` 解析。文件缺失是合法的“无规则”状态，而文件格式错误会被报告并跳过，而不是中止挂载流程。

## 防护模块 {#Modules}

| 领域 | 内核行为 |
| --- | --- |
| 文件 | 在 `PreCreate` 中拦截系统二进制文件伪装：在 `AppData`、`Downloads`、`Desktop`（含 OneDrive 重定向的桌面）或 `ProgramData` 下，以写方式打开并创建或替换某个系统二进制文件名（`svchost.exe`、`rundll32.exe`、`regsvr32.exe`、`dllhost.exe`、`lsass.exe`、`csrss.exe`、`smss.exe`、`winlogon.exe`、`wininit.exe`、`services.exe`、`spoolsv.exe`、`taskhostw.exe`、`conhost.exe`、`dwm.exe`、`dllhst3g.exe`）时，会同步以 `STATUS_ACCESS_DENIED` 拒绝——不产生事件，也不往返用户态。CI 信任的进程和已注册客户端例外。 |
| 勒索软件 | `RansomwareMonitor` 从两个维度统计破坏性打开操作。用户数据：在 `XDOWS_RANSOM_WINDOW_MS`（3000）内出现 `XDOWS_RANSOM_FILE_THRESHOLD`（10）次文档/媒体写入。系统目录：脚本宿主（`cmd`、`powershell`、`pwsh`、`wscript`、`cscript`、`mshta`、`rundll32`、`regsvr32`）对任意 `\Windows\` 子树的破坏性打开，在独立的槽表中于 `XDOWS_RANSOM_SYS_WINDOW_MS`（3000）内达到 `XDOWS_RANSOM_SYS_FILE_THRESHOLD`（50）次，之后进一步的打开会以 `STATUS_VIRUS_INFECTED` 拒绝。CI 信任闸门被刻意不应用于系统维度，因为解释器二进制始终是合法签名的——脚本宿主身份才是判别依据。 |
| 注册表 | 内核注册表回调会为等待用户决策而挂起创建、设置值、删除值、删除键、重命名、还原、替换和卸载操作。规则路径预算为 `XDOWS_SECURITY_MAX_REGISTRY_RULES`（32）；应用在 `Recommended` 下部署 26 条规则。当关键持久化键被确认 Block 时，闸门会识别 `KillActor` 哨兵值（`0x4B494C4C`），并通过共享的注入护栏反杀发起者。 |
| 注入 | `ObRegisterCallbacks` 会剥离危险的句柄权限，并始终上报 `ProcessInjection` / `ThreadInjection` 事件；反杀原语与行为闸门和注册表闸门共享。 |
| 自我防护 | 限制针对受保护进程的危险句柄和注入前置条件，并通过一次性令牌验证受控关闭。 |
| 引导 | 主驱动保护 EFI/BCD 写入；BootFilter 保护系统盘原始引导区域写入，并在完成前等待用户态决策。 |

## 通信健壮性 {#Robustness}

`IOCTL_XDOWS_SECURITY_GET_NEXT_EVENTS` 在一次调用中最多取走 16 个事件，且从不阻塞；客户端自行控制循环节奏，只读取 `Count` 个条目。批量结构体保持在 .NET LOH 阈值 85 KB 以下，以便应用池化其缓冲区。`XDOWS_SECURITY_REGISTER_FLAG_ASYNC_REVIEW` 会把非关键事件类型排入队列以供展示，同时发起线程立即以默认的 Allow 决策返回——`FileRename` 除外，因为它在 `PreSetInformation` 中运行，可能以 `STATUS_VIRUS_INFECTED` 使操作失败，必须保持同步，以便用户态仍能阻止勒索软件式的重命名。

按类型的滑动窗口（1 秒）速率限制会节流非关键噪声类型（文件创建 200/秒、文件写入 300/秒、驱动日志 100/秒）。被节流的事件会静默丢弃，并计入 `DroppedByType`。关键类型——进程创建、文件重命名、句柄与线程操作、已确认行为、引导写入和注册表写入——从不节流。

## 构建与安装 {#Build}

驱动项目是 WDK `.vcxproj` 项目，需要带 WDK 集成的 Visual Studio C++ MSBuild；仅靠 `dotnet` CLI 无法构建。工具链、构建命令和安装流程见 [构建与安装](../build)。

## 版权说明 {#License}

该项目使用 MIT 许可证，详情请参阅 [LICENSE](https://github.com/XTY64XTY/Xdows-Security-Driver/blob/master/LICENSE)。
