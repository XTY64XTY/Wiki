---
title: 故障排查
description: Xdows Security 5 的常见问题、故障排查表和安全验证边界。
---

# 故障排查 {#Troubleshooting}

## 常见问题 {#FAQ}

| 现象 | 处理 |
|-----|------|
| 无法启用驱动防护 | 先打开驱动环境检测；依次检查运行权限、签名策略、双驱动包/服务、双驱动通信和模型资源 |
| 主驱动或 BootFilter 包缺失 | 重新完整解压发布包；源码构建时使用主解决方案和 VS/MSBuild，不要只生成托管项目 |
| 驱动因签名失败而无法加载 | 开发构建仅在可恢复测试环境使用测试签名；当前发布范围是开发与测试机签名，不包含生产 EV、attestation 或 HLK 签名流程 |
| 服务已安装但通信失败 | 刷新环境检测，确认主驱动和 BootFilter 服务均在运行；修复后重试，仍失败时查看应用与驱动日志 |
| 提示协议或构建不匹配 | 主程序、主驱动和 BootFilter 必须来自同一发布包；不要混用旧的 `Driver` 目录。主驱动与桥接使用协议 v9，BootFilter 使用其独立的 v1 |
| `MSB4278`、`Microsoft.Cpp.Default.props`、Inf2Cat 或 SignTool 缺失 | 安装或修复 Visual Studio C++、Windows SDK 和 WDK 集成，并用 Visual Studio MSBuild 构建 |
| `inf2cat` 报 `DriverVer set to a date in the future` | 保持驱动项目中的 `Inf2CatUseLocalTime` 为启用状态并重新构建；这可避免午夜前后 UTC/本地时间不一致 |
| 无法使用 Xdows Model | 安装 [Visual C++ Redistributable v14](https://learn.microsoft.com/zh-cn/cpp/windows/latest-supported-vc-redist?view=msvc-170)，并确认原生模型和 ONNX Runtime 文件完整。确认应用同级的 `Models\` 中包含 `Xdows-Model-Pro.manifest.json` 和全部五个 Pro 分支模型 |
| 模型更新后 Pro 或 Adaptive 扫描立即失败 | Pro 模型、它的五个分支模型和 manifest 必须一起部署；没有匹配 manifest 的 5 输入 Fusion 模型会被设计上直接拒绝 |
| Windows App SDK 或 .NET 缺失 | 官方发布包通常自包含所需运行时；如果包损坏请重新下载，否则安装与该版本匹配的 [Windows App SDK](https://learn.microsoft.com/zh-cn/windows/apps/windows-app-sdk/downloads) 和 [.NET](https://dotnet.microsoft.com/zh-cn/download) |
| 无法建立 R3 引导基线 | 确认应用以管理员身份运行、当前系统可正常启动且磁盘访问未被阻止；只在确认当前状态可信时重建基线 |
| R3 注册表反复提示 | 查看日志确认修改者和规则类别，然后升级到同一发布包的全部组件；不要通过关闭 R0 驱动模块来规避问题 |

## 验证脚本 {#Scripts}

源码层面的检查随拥有对应代码的仓库提供，而不是随应用提供：

| 检查 | 脚本 |
|-----|------|
| 驱动包与签名 | `Xdows-Security-Driver\tests\Invoke-DriverPackageSmoke.ps1` |
| 内核模块源码冒烟（behavior、file、registry、self-protect、process manager、boot filter、shutdown token、decision timeout） | `Xdows-Security-Driver\tests\Invoke-*SourceSmoke.ps1` |
| 托管与原生模型一致性 | `Xdows-Model\tests\Invoke-NativeConsistency.ps1 -SkipBuild` |
| VM、Driver Verifier、压力与性能证据 | `Xdows-Security-Driver\tests\driver-validation-matrix.md` |

## 安全验证边界 {#SafetyBoundary}

源码冒烟、协议镜像和非破坏性构建检查不能替代真实内核运行时验证。物理磁盘写入、EFI 修复、过滤驱动卸载和 R0 内核注册表阻断等破坏性场景，只应在带快照且可恢复的一次性虚拟机中验收。本文不宣称这些场景已在当前主机完成运行时验证。

切勿在不可恢复的主机上运行 Driver Verifier；请始终使用虚拟机快照。
