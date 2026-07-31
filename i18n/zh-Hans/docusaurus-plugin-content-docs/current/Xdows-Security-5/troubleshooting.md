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
