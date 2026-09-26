---
title: 核心驅動程式架構
description: Xdows Security 核心元件、協定 v9、IOCTL 對應、能力位、行為類型、宣告式行為規則、發起者排除和防護模組。
---

# 核心驅動程式架構 {#Driver}

Xdows Security 的 R0 端由 `Xdows-Security-Driver` 倉庫交付。它包含兩個核心元件，隨同一驅動程式套件發布，並隨「驅動程式防護」一同啟停：

| 元件 | 類型 | 作用 |
| --- | --- | --- |
| `Xdows-Security-Driver` | 執行於 FltMgr 的 KMDF 迷你篩選器驅動程式 | 產生處理程序、檔案、控制代碼、行為、開機和登錄檔事件；在使用者模式做出決策前保留受保護操作 |
| `Xdows-Security-BootFilter` | 獨立的 WDM 儲存體篩選驅動程式 | 保護系統磁碟的原始開機區域寫入 |

主驅動程式以檔案系統驅動程式身分註冊，於 `FSFilter Activity Monitor` 載入順序群組中設定 `StartType = DEMAND_START`，相依於 `FltMgr`，並使用高度值 `370030`。

## 職責邊界 {#Boundary}

驅動程式倉庫擁有 `Public.h`——協定常數、IOCTL、事件／決策／狀態／授權／處理程序／記錄結構——以及核心事件產生、待處理佇列與逾時行為、權杖雜湊、自我防護、注入防護和記錄緩衝。

主程式倉庫在 `Protection\DriverProtocol.cs` 中鏡像 `Public.h`，擁有 `Protection\DriverBridgeClient.cs` 中的橋接與 `Protection\DriverProtection.cs` 中的策略，並透過 `DriverInstaller` / `DriverPackageInstaller` 安裝套件。模型倉庫擁有 `Xdows-Model-Native.dll` 的 C ABI、ONNX Runtime 相依項目和 ONNX 模型檔案；驅動程式本身從不載入模型。

任何對 `Public.h` 的變更，只要改動了結構佈局、列舉值、IOCTL 代碼、字串緩衝長度、權杖長度或裝置路徑，就必須在同一次變更中一併更新 `DriverProtocol.cs`、IOCTL 行為有變時的 `DriverBridgeClient.cs`、事件或決策語意有變時的 `DriverProtection.cs`，以及使用說明文件。

## 協定版本 {#Protocol}

目前主驅動程式協定版本為 **9**。BootFilter 使用其獨立的協定 **v1**。兩者不能互換。

協定 7 加入了 `Behavior` 事件、共用的 `BehaviorType` 承載、各類型狀態計數器，以及 R0 行為模組和能力位。協定 9 加入了 `SetBootProtection`（0x80E）、`SetRegistryProtection`（0x80F）、`RegistryWrite` 事件（類型 11）、能力位 `0x200` 和模組位 `0x40`。

之後的每次新增都停留在協定 9 上，作為純粹的附加區塊，因此較舊的主程式組建仍能對較新的驅動程式運作，反之亦然。新的列舉值一律附加在後；既有值永遠不會被重新賦予新意義。

## IOCTL 對應 {#IOCTL}

| IOCTL | 功能 | 用途 |
| --- | --- | --- |
| `IOCTL_XDOWS_SECURITY_REGISTER_CLIENT` | `0x801` | 註冊主程式橋接並回傳一次性的提權授權權杖 |
| `IOCTL_XDOWS_SECURITY_HEARTBEAT` | `0x802` | 維持橋接存活狀態 |
| `IOCTL_XDOWS_SECURITY_GET_NEXT_EVENT` | `0x803` | 取出一個待處理的防護事件 |
| `IOCTL_XDOWS_SECURITY_SUBMIT_DECISION` | `0x804` | 為某事件回傳 Allow、Block 或 Timeout |
| `IOCTL_XDOWS_SECURITY_GET_STATE` | `0x805` | 查詢橋接和佇列狀態 |
| `IOCTL_XDOWS_SECURITY_DISCONNECT_CLIENT` | `0x806` | 明確中斷橋接連線 |
| `IOCTL_XDOWS_SECURITY_REGISTER_PROTECTED_PROCESS` | `0x807` | 為主程式處理程序註冊自我防護 |
| `IOCTL_XDOWS_SECURITY_SET_VOLUNTARY_EXIT` | `0x808` | 告知驅動程式主程式即將刻意結束 |
| `IOCTL_XDOWS_SECURITY_AUTHORIZED_SHUTDOWN` | `0x809` | 使用一次性關機權杖停止防護 |
| `IOCTL_XDOWS_SECURITY_GET_NEXT_LOG` | `0x80A` | 取出一筆緩衝的驅動程式記錄項目 |
| `IOCTL_XDOWS_SECURITY_SET_STARTUP_PROTECTION` | `0x80B` | 同步開機項目自我防護 |
| `IOCTL_XDOWS_SECURITY_QUERY_PROCESSES` | `0x80C` | 權杖授權的分頁式核心處理程序快照 |
| `IOCTL_XDOWS_SECURITY_OPERATE_PROCESS` | `0x80D` | 通過受保護用戶端和權杖驗證後，暫停、繼續或終止處理程序 |
| `IOCTL_XDOWS_SECURITY_SET_BOOT_PROTECTION` | `0x80E` | 設定 EFI 和 BCD 開機防護 |
| `IOCTL_XDOWS_SECURITY_SET_REGISTRY_PROTECTION` | `0x80F` | 設定 R0 登錄檔防護規則 |
| `IOCTL_XDOWS_SECURITY_GET_NEXT_EVENTS` | `0x810` | 以一次非阻塞呼叫取出最多 16 個未交付事件 |
| `IOCTL_XDOWS_SECURITY_SET_BEHAVIOR_RULES` | `0x811` | 取代宣告式行為規則集（能力位 `0x1000`） |
| `IOCTL_XDOWS_SECURITY_SET_INITIATOR_EXCLUSIONS` | `0x812` | 取代發起者排除清單（能力位 `0x2000`） |

處理程序管理請求同時需要已註冊且自我防護的主處理程序身分，以及註冊時核發的授權權杖。驅動程式會拒絕 PID 0、PID 4、呼叫中的主處理程序、受保護處理程序和關鍵處理程序。

## 能力位與模組位 {#Capabilities}

驅動程式會回報能力，讓主程式能優雅降級，而不是發出不受支援的下行呼叫：

| 能力 | 值 | 意義 |
| --- | --- | --- |
| `CAP_PRIORITY_QUEUE` | `0x1` | 優先順序事件佇列 |
| `CAP_DIRTY_WRITE_COALESCING` | `0x2` | 合併重複的髒寫入 |
| `CAP_BUILD_ID` | `0x4` | 驅動程式回報建置識別碼 |
| `CAP_STARTUP_SELF_PROTECT` | `0x8` | 開機項目自我防護 |
| `CAP_USER_DECISION_HOLD` | `0x10` | 保留操作以等待使用者決策 |
| `CAP_PROCESS_MANAGEMENT` | `0x20` | 核心處理程序管理 |
| `CAP_ENHANCED_SELF_PROTECT` | `0x40` | 增強自我防護 |
| `CAP_R0_BEHAVIOR_PROTECTION` | `0x80` | R0 行為模組 |
| `CAP_R0_BOOT_PROTECTION` | `0x100` | R0 開機防護 |
| `CAP_R0_REGISTRY_PROTECTION` | `0x200` | R0 登錄檔防護 |
| `CAP_ASYNC_REVIEW` | `0x400` | 非關鍵事件可非同步審查 |
| `CAP_EVENT_BATCH` | `0x800` | 批次取出事件 |
| `CAP_RULE_INTERPRETER` | `0x1000` | 宣告式行為規則解譯器 |
| `CAP_INITIATOR_EXCLUSION` | `0x2000` | 發起者排除清單 |

模組位回報哪些防護模組處於作用中：TokenAuth `0x1`、Process `0x2`、File `0x4`、Injection `0x8`、SelfProtect `0x10`、Behavior `0x20`、Registry `0x40`。

## 事件與行為類型 {#BehaviorTypes}

`Behavior` 事件一律攜帶 `ThreatConfirmed` 旗標，並在任何路徑解析或 UI 工作之前先進入使用者決策保留。行為類型值如下：

| 值 | 名稱 | 備註 |
| --- | --- | --- |
| 0 | `None` | |
| 1 | `VssDeletion` | 陰影複製銷毀 |
| 2 | `HiddenPowerShell` | |
| 3 | `EncodedCommand` | |
| 4 | `PolicyBypass` | 基礎設施失敗時放行 |
| 5 | `DownloadExecute` | |
| 6 | `LolbinAbuse` | |
| 7 | `ProcessInjection` | 關聯危險的處理程序控制代碼請求 |
| 8 | `ThreadInjection` | 關聯危險的執行緒控制代碼請求 |
| 9 | `ParentProcessChain` | |
| 10 | `AutorunInf` | |
| 11 | `ProtectedProcessTerminate` | |
| 12 | `SensitiveProcessHandle` | |
| 13 | `DestructiveDirectoryDelete` | 基礎設施失敗時放行 |
| 14 | `OwnershipEscalation` | 基礎設施失敗時放行 |
| 15 | `SystemControlCommand` | 基礎設施失敗時放行 |
| 16 | `EfiMount` | `mountvol` + `/s`；**拒絕優先** |
| 17 | `OobeReset` | `sysprep` + `/oobe` / `/generalize` / `/audit`；**拒絕優先** |
| 18 | `SystemDirectoryRansomware` | 保留：純粹在核心中強制執行，永遠不會到達使用者模式 |

## 決策語意 {#Decisions}

- `Allow`：繼續原有操作。
- `Block`：拒絕原有操作。
- `Timeout`：使用者模式決策逾時；已確認威脅對應為拒絕行為。

當橋接或模型在威脅被確認**之前**失敗時，使用者模式會放行並記錄該失敗。高可信度的命令規則保持其核心拒絕優先行為，原則略過維持放行優先，注入則維持其既有的放行優先基礎設施策略。當威脅已確認而使用者拒絕或逾時時，決策為 Block 或 Timeout。

## 宣告式行為規則 {#BehaviorRules}

能力位 `0x1000` 加入一個由使用者模式撰寫的規則解譯器，因此新的行為涵蓋範圍不再需要重新建置驅動程式。一條規則是 **Initiator × CommandLine × Target** 三元組：

| 欄位 | 意義 |
| --- | --- |
| `RuleId`、`BehaviorType` | 兩者都必須非零 |
| `Operations` | `PROCESS_CREATE 0x1`、`FILE_CREATE 0x2`、`FILE_WRITE 0x4`、`FILE_DELETE 0x8`、`FILE_RENAME 0x10`、`ALL 0x1F` 的遮罩 |
| `Threshold` / `WindowMs` | 選用的速率限制：`0` 表示每次符合都觸發；否則同一處理程序必須在 `WindowMs` 內符合 `Threshold` 次（上限截斷為 60000） |
| `TargetMatchKind` | `Any 0`、`Suffix 1`、`Segment 2`、`Prefix 3`、`Contains 4` |
| `Flags` | `KILL_ACTOR 0x1`、`FAIL_CLOSED 0x2` |
| `Initiator` / `Target` / `CommandLine` | 詞條軸，各自可容納最多 3 個詞條，每個詞條 96 個寬字元（含 NUL） |

軸語意：`TermCount == 0` 表示該軸不受約束。Initiator 詞條是映像葉名稱（`cmd.exe`），或在其包含反斜線時，是不區分大小寫的行為者路徑後綴。每個 CommandLine 詞條都必須以子字串形式出現。Target 詞條依規則的 `TargetMatchKind` 解讀，且當**任一** target 詞條符合時規則即符合。完全不約束任何軸的規則會被拒絕。

整個請求會在套用任何內容之前先驗證，並以整體為單位拒絕，因此格式錯誤的規則永遠不會留下部分套用的集合：`TargetMatchKind` 必須在範圍內，`Operations` 必須非零且在支援的遮罩內，`Flags` 只能包含已知位，`Threshold` 必須為 `0..10000`，且每個詞條都必須非空、在其固定緩衝內以 NUL 結尾，並且不含字面 `*` / `?` 萬用字元——解譯器只做字面比對，因此含萬用字元的詞條會默默永不匹配，並掩蓋設定錯誤。被拒絕的請求會回傳 `STATUS_INVALID_PARAMETER`，並保持前一組集合不變。交換在評估路徑以共用方式持有的 `EX_PUSH_LOCK` 的獨占側下進行。

放行／拒絕是**每條規則各自的屬性**，而不是依規則 ID 寫死的清單：發生基礎設施失敗時，沒有 `FAIL_CLOSED` 的規則會放行操作並記錄，帶有該旗標的規則則以 `STATUS_ACCESS_DENIED` 拒絕。`KILL_ACTOR` 會將已確認的 Block 升級為對行為中處理程序的反制終止，並共用注入防護護欄（絕不針對已註冊的用戶端、關鍵系統處理程序、自我防護處理程序或 PID ≤ 4）。受速率限制的規則以（規則 ID、處理程序 ID）為鍵，記錄在固定的 32 槽滑動視窗中。

固定的核心內建規則永遠在宣告式集合**之前**評估，因此其放行／拒絕分類保持不變，宣告式集合只能增加涵蓋範圍，永遠不會削弱內建的拒絕。上限為 32 條規則。

## 發起者排除 {#InitiatorExclusions}

能力位 `0x2000` 讓主程式對已知良好的行為者抑制使用者模式諮詢：最多 32 個項目、每個 160 個寬字元，各帶一個 `ScopeMask`，其值為 `Process 0x1`、`File 0x2`、`Handle 0x4`、`Registry 0x8`（`ALL 0xF`）。模式是映像葉名稱（`steam.exe`），或在其包含反斜線時，是不區分大小寫的行為者路徑後綴。`Count = 0` 會清空清單。

排除刻意在**所有**關鍵閘門之後才評估，因此過寬的清單只會降低雜訊，永遠不會降低防護：

- 控制代碼閘門只在敏感處理程序權利剝除閘門之後；
- 登錄檔閘門只在 CI 信任閘門之後；
- 檔案閘門只在內建拒絕和 autorun 規則之後；
- 處理程序閘門只在固定的核心命令列規則之後。

它們也永遠不會繞過已確認威脅的命令列規則。由於熱路徑閘門只解析請求者映像葉名稱，而不會實體化行為者路徑，**路徑後綴**模式只適用於 `Process` 範圍；在 `File`、`Handle` 和 `Registry` 範圍上則單純不會符合。除非只針對處理程序閘門，否則請以葉名稱撰寫排除項。

規則集在主程式中撰寫為 `Config\BehaviorRules.json`，並由 `DriverBehaviorRuleCatalog` 解析。檔案缺失是有效的「無規則」狀態，而格式錯誤的檔案會被回報並略過，而不是中止附加流程。

## 防護模組 {#Modules}

| 領域 | 核心行為 |
| --- | --- |
| 檔案 | 在 `PreCreate` 中攔截系統二進位檔偽裝：對 `AppData`、`Downloads`、`Desktop`（包含透過 OneDrive 重導的桌面）或 `ProgramData` 之下建立或取代系統二進位檔名稱（`svchost.exe`、`rundll32.exe`、`regsvr32.exe`、`dllhost.exe`、`lsass.exe`、`csrss.exe`、`smss.exe`、`winlogon.exe`、`wininit.exe`、`services.exe`、`spoolsv.exe`、`taskhostw.exe`、`conhost.exe`、`dwm.exe`、`dllhst3g.exe`）的寫入開啟，會以 `STATUS_ACCESS_DENIED` 同步拒絕——不產生事件，也不進行使用者模式來回。CI 信任的處理程序和已註冊用戶端豁免。 |
| 勒索軟體 | `RansomwareMonitor` 在兩個維度上計算破壞性開啟。使用者資料：在 `XDOWS_RANSOM_WINDOW_MS`（3000）內發生 `XDOWS_RANSOM_FILE_THRESHOLD`（10）次文件／媒體寫入。系統目錄：由指令碼宿主（`cmd`、`powershell`、`pwsh`、`wscript`、`cscript`、`mshta`、`rundll32`、`regsvr32`）在任何 `\Windows\` 子樹下進行的破壞性開啟，在另一張槽表中於 `XDOWS_RANSOM_SYS_WINDOW_MS`（3000）內超過 `XDOWS_RANSOM_SYS_FILE_THRESHOLD`（50）次，之後進一步的開啟會以 `STATUS_VIRUS_INFECTED` 拒絕。CI 信任閘門刻意不套用於系統維度，因為解譯器二進位檔本身永遠是合法簽章的——指令碼宿主身分才是區別特徵。 |
| 登錄檔 | 核心登錄檔回呼保留建立、設定值、刪除值、刪除機碼、重新命名、還原、取代和卸載操作以等待使用者決策。規則路徑預算為 `XDOWS_SECURITY_MAX_REGISTRY_RULES`（32）；主程式在 `Recommended` 下部署 26 條規則。對關鍵持續性機碼確認 Block 時，閘門遵循 `KillActor` 哨兵值（`0x4B494C4C`），並透過共用的注入防護護欄對行為者進行反制終止。 |
| 注入 | `ObRegisterCallbacks` 剝除危險的控制代碼權利，並一律回報 `ProcessInjection` / `ThreadInjection` 事件；反制終止原語與行為及登錄檔閘門共用。 |
| 自我防護 | 限制針對受保護處理程序的危險控制代碼和注入前置條件，並透過一次性權杖驗證受控關閉。 |
| 開機 | 主驅動程式保護 EFI/BCD 寫入；BootFilter 保護系統磁碟的原始開機區域寫入，並在完成前等待使用者模式決策。 |

## 通訊健壯性 {#Robustness}

`IOCTL_XDOWS_SECURITY_GET_NEXT_EVENTS` 在一次呼叫中取出最多 16 個事件且永不阻塞；用戶端自行調整迴圈節奏，只讀取 `Count` 個項目。批次結構保持在 85 KB 的 .NET LOH 閾值以下，讓主程式可以集區化其緩衝區。`XDOWS_SECURITY_REGISTER_FLAG_ASYNC_REVIEW` 會將非關鍵事件類型排入顯示佇列，同時原始執行緒立即以預設的 Allow 決策返回——`FileRename` 被排除在外，因為它執行於 `PreSetInformation`，可能以 `STATUS_VIRUS_INFECTED` 使操作失敗，且必須保持同步，讓使用者模式仍能阻擋勒索軟體式的重新命名。

各類型滑動視窗（1 秒）速率限制會節流非關鍵的雜訊類型（檔案建立 200/s、檔案寫入 300/s、驅動程式記錄 100/s）。被節流的事件會默默丟棄並計入 `DroppedByType`。關鍵類型——處理程序建立、檔案重新命名、控制代碼與執行緒操作、已確認行為、開機寫入和登錄檔寫入——永遠不會被節流。

## 建置與安裝 {#Build}

驅動程式專案是 WDK `.vcxproj` 專案，需要搭配 WDK 整合的 Visual Studio C++ MSBuild；單靠 `dotnet` CLI 無法建置它們。工具鏈、建置命令和安裝流程見 [建置與安裝](../build)。

## 版權說明 {#License}

該專案使用 MIT 授權條款，詳情請參閱 [LICENSE](https://github.com/XTY64XTY/Xdows-Security-Driver/blob/master/LICENSE)。
