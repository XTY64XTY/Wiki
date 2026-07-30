---
title: Xdows Security 5
description: Xdows Security 5 快速开始、R0/R3 防护边界、驱动环境、构建安装和故障排查指南。
---

# 快速开始 {#GetStarted}

Xdows Security 5 是使用 WinUI 3 和 C# 构建的开源 Windows 安全防护产品，按照 MIT 许可证发布。

## 下载与首次运行 {#Download}

1. 从 [Releases](https://github.com/XTY64XTY/Xdows-Security-5/releases) 下载最新版本的 `Xdows-Security.zip`。
2. 将压缩包完整解压到本地目录。不要只复制 `Xdows-Security.exe`，驱动包、BootFilter 和原生模型资源必须保留原有目录结构。
3. 运行 `Xdows-Security.exe`。使用扫描功能不一定需要管理员权限；安装、启动、修复或停止驱动时必须以管理员身份运行。
4. 需要 R0 防护时，在设置中启用驱动防护。程序会检查环境、安装主驱动与 BootFilter，并建立通信。
5. 如果启用失败，请打开驱动环境检测，按照检查组提供的修复操作处理后刷新。

<Linkcard url="https://github.com/XTY64XTY/Xdows-Security-5/releases" title="下载 Xdows Security 5" description="https://github.com/XTY64XTY/Xdows-Security-5/releases" logo="/logo.ico"/>
<Linkcard url="https://qm.qq.com/q/ybEtoc5rFe" title="进入 QQ 群" description="https://qm.qq.com/q/ybEtoc5rFe" logo="/logo.ico"/>

> [!NOTE]
> 如果 GitHub 无法访问或下载缓慢，可通过 QQ 群获取发布包。

> [!IMPORTANT]
> BootFilter 是独立的存储过滤驱动，但它随 Xdows Security 驱动包一同发布，并随“驱动防护”整体启停。R0 引导防护和 R0 注册表防护都没有单独开关。

## 防护能力与层级边界 {#Protection}

Xdows Security 同时提供用户态 R3 防护和驱动支持的 R0 防护。两者不是两个可独立安装的产品，也不能把 R3 的检测结果等同于内核在操作发生前的阻断。

| 防护领域 | R3 用户态职责 | R0 驱动职责 |
|---------|--------------|-------------|
| 进程与文件 | 在用户态监控、扫描、记录并执行兼容防护流程 | 在进程创建及文件创建、写入、重命名等操作完成前提交事件并等待决策 |
| 高风险行为 | 提供用户态检测、日志和兼容处理，但不承担内核前置拦截 | 拦截高风险命令行为、敏感句柄操作和注入相关行为，并统一进入用户决策流程 |
| 引导防护 | 建立可信引导基线，监控原始引导结构及活动 EFI/BCD 文件；检测差异后修复并让用户决定保留修复或放行并更新基线 | 主驱动保护 EFI/BCD 文件写入；独立 BootFilter 保护系统盘原始引导区域写入，在写入完成前等待用户态决策 |
| 注册表防护 | 通过 ETW 观察受保护规则的变化，合并重复事件、识别并扫描修改者、记录并询问用户；阻止选择发生在检测之后，不能替代事务级回滚 | 通过内核注册表回调在创建、设置值、删除值、删除键、重命名、还原、替换和卸载操作完成前等待用户决策 |
| 自我防护 | 负责主程序状态、日志和用户交互 | 限制针对受保护进程的危险句柄和注入前置条件，并验证受控关闭 |

### 开关与失败策略

- “驱动防护”是 R0 能力的总开关。R0 引导防护、R0 注册表防护和 BootFilter 不提供独立开关。
- 设置中的注册表总开关及“辅助规则”“其他规则”只控制 R3 注册表防护及其规则类别，不单独控制 R0 注册表模块。
- R0 注册表与引导操作需要用户态桥接提供决策。桥接缺失、等待超时或资源不足时，受保护操作按保守策略拒绝并记录。
- BootFilter 使用独立协议 v1；主驱动与托管桥接使用协议 v9。两套协议不能混用。
- 当前主驱动身份为协议 v9、构建 ID `2026073001`、能力掩码 `0x000003FF`；必需模块掩码包含 Registry (`0x40`)。

### 扫描引擎

| 名称 | 介绍 | 开源 |
|-----|------|------|
| Xdows Local | 使用导入表、导出表等静态特征分析 PE 文件 | 全部开源 |
| Xdows Model | 使用 ONNX 模型进行检测，支持 Flash、Standard、Adaptive 和 Pro 模式 | 全部开源 |
| 基于云的扫描引擎 | 由 `MEMZUAC` 提供的云扫描服务 | 不开源 |

Xdows Tools 是产品内置的工具集；产品名始终写作 `Xdows Tools`。

## 驱动环境 {#DriverEnvironment}

驱动环境检测将状态合并为四组。主驱动与 BootFilter 在同一组内分别显示状态，但这不表示它们可以单独开启。

| 检查组 | 检查内容 | 常见处理 |
|-------|---------|---------|
| 运行权限 | 当前进程是否具有管理员权限 | 以管理员身份重新启动 Xdows Security |
| 驱动签名与系统策略 | 开发环境的测试签名状态，以及正式签名和系统策略提示 | 开发环境使用可恢复测试机；正式发布使用可信生产签名 |
| 双驱动包及服务 | 主驱动和 BootFilter 的 INF、SYS、CAT 包及对应服务 | 保留完整发布目录，使用按项修复重新安装或启动 |
| 双驱动通信与模型资源 | 主驱动通信、BootFilter 通信和原生模型资源 | 启动服务、修复包或重新生成完整解决方案输出 |

修复操作完成后，环境检测会重新检查对应状态。签名检查为警告并不一定表示正式签名驱动不可用：系统信任的正式签名无需依赖测试签名模式。

> [!WARNING]
> 测试签名只适用于开发和测试环境。不要把启用测试签名模式作为正式发布或生产部署方案；正式发布必须使用 Windows 信任的生产驱动签名。

## 构建与安装 {#Build}

### 环境要求

- Windows 10/11。
- Git 和 Visual Studio 2026。
- .NET 10、WinUI 3、MSVC C++ 工具链和 WDK 集成。
- 与项目匹配的 Windows SDK/WDK；当前驱动项目使用 `10.0.28000.0`。
- 安装和运行驱动所需的管理员权限。
- 能正常访问 GitHub 及 NuGet 源。

### 从源码构建

将三个仓库克隆到同一父目录：

```powershell
git clone https://github.com/XTY64XTY/Xdows-Security-5 Xdows-Security
git clone https://github.com/XTY64XTY/Xdows-Model
git clone https://github.com/XTY64XTY/Xdows-Security-Driver
```

使用 Visual Studio 或 Visual Studio MSBuild 生成 `Xdows-Security\Xdows-Security.slnx`，开发验证通常选择 `Debug|x64`，发布验证选择 `Release|x64`。主解决方案会同时生成原生模型、主驱动和 BootFilter，并将资产复制到主程序输出。

完整输出至少应包含：

- `Xdows-Model-Native.dll`、ONNX 模型和 ONNX Runtime 依赖。
- `Driver\Xdows-Security-Driver.inf`、`Xdows-Security-Driver.sys` 及 CAT 签名目录文件。
- `Driver\BootFilter\Xdows-Security-BootFilter.inf`、`Xdows-Security-BootFilter.sys` 及 CAT 签名目录文件。

> [!NOTE]
> 只有 `dotnet` CLI 的环境不能完整生成 WDK `.vcxproj` 驱动项目。出现 `MSB4278` 或缺少 `Microsoft.Cpp.Default.props` 时，请安装 Visual Studio C++ MSBuild 与 WDK 集成，并使用 Visual Studio MSBuild 重新生成；这类错误不应通过跳过驱动项目来掩盖。

### 安装驱动

首次安装优先使用主程序流程：

1. 以管理员身份运行完整构建输出中的 `Xdows-Security.exe`。
2. 启用“驱动防护”并接受风险提示。
3. 主程序按需注册设备、安装主驱动和 BootFilter、启动服务并连接桥接通道。
4. 如果任一步骤失败，使用驱动环境检测的按项修复并刷新。

本地开发签名不受目标系统信任时，只能在可恢复的测试机或一次性虚拟机中按组织策略启用测试签名。正式安装包必须使用可信生产签名，不能要求最终用户降低系统签名策略。

## 故障排查 {#Troubleshooting}

| 现象 | 处理 |
|-----|------|
| 无法启用驱动防护 | 先打开驱动环境检测；依次检查运行权限、签名策略、双驱动包/服务、双驱动通信和模型资源 |
| 主驱动或 BootFilter 包缺失 | 重新完整解压发布包；源码构建时使用主解决方案和 VS/MSBuild，不要只生成托管项目 |
| 驱动因签名失败而无法加载 | 开发构建仅在可恢复测试环境使用测试签名；正式包应验证 SYS/CAT 的可信生产签名 |
| 服务已安装但通信失败 | 刷新环境检测，确认主驱动和 BootFilter 服务均在运行；修复后重试，仍失败时查看应用与驱动日志 |
| 提示协议或构建不匹配 | 主程序、主驱动和 BootFilter 必须来自同一发布包；不要混用旧的 `Driver` 目录 |
| `MSB4278`、`Microsoft.Cpp.Default.props`、Inf2Cat 或 SignTool 缺失 | 安装或修复 Visual Studio C++、Windows SDK 和 WDK 集成，并用 Visual Studio MSBuild 构建 |
| 无法使用 Xdows Model | 安装 [Visual C++ Redistributable v14](https://learn.microsoft.com/zh-cn/cpp/windows/latest-supported-vc-redist?view=msvc-170)，并确认原生模型和 ONNX Runtime 文件完整 |
| Windows App SDK 或 .NET 缺失 | 官方发布包通常自包含所需运行时；如果包损坏请重新下载，否则安装与该版本匹配的 [Windows App SDK](https://learn.microsoft.com/zh-cn/windows/apps/windows-app-sdk/downloads) 和 [.NET](https://dotnet.microsoft.com/zh-cn/download) |
| 无法建立 R3 引导基线 | 确认应用以管理员身份运行、当前系统可正常启动且磁盘访问未被其他安全软件阻止；只在确认当前状态可信时重建基线 |
| R3 注册表反复提示 | 查看日志确认修改者和规则类别，升级到同一发布包的最新组件；不要通过关闭 R0 驱动模块来规避问题 |

## 安全验证边界 {#SafetyBoundary}

源码冒烟、协议镜像和非破坏性构建检查不能替代真实内核运行时验证。物理磁盘写入、EFI 修复、过滤驱动卸载和 R0 内核注册表阻断等破坏性场景，只应在带快照且可恢复的一次性虚拟机中验收。本文不宣称这些场景已在当前主机完成运行时验证。

## 版权说明 {#License}

该项目使用 MIT 许可证，详情请参阅 [LICENSE](https://github.com/XTY64XTY/Xdows-Security-5/blob/main/LICENSE.txt)。
