---
title: 构建与安装
description: Xdows Security 5 的环境要求、源码构建和驱动安装指南。
---

# 构建与安装 {#Build}

## 环境要求 {#Requirements}

- Windows 10/11。
- Git 和 Visual Studio 2026。
- .NET 10、WinUI 3、MSVC C++ 工具链和 WDK 集成。
- 与项目匹配的 Windows SDK/WDK；当前驱动项目使用 `10.0.28000.0`。
- 安装和运行驱动所需的管理员权限。
- 能正常访问 GitHub 及 NuGet 源。

## 从源码构建 {#FromSource}

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

:::note
只有 `dotnet` CLI 的环境不能完整生成 WDK `.vcxproj` 驱动项目。出现 `MSB4278` 或缺少 `Microsoft.Cpp.Default.props` 时，请安装 Visual Studio C++ MSBuild 与 WDK 集成，并使用 Visual Studio MSBuild 重新生成；这类错误不应通过跳过驱动项目来掩盖。
:::

## 安装驱动 {#Install}

首次安装优先使用主程序流程：

1. 以管理员身份运行完整构建输出中的 `Xdows-Security.exe`。
2. 启用"驱动防护"并接受风险提示。
3. 主程序按需注册设备、安装主驱动和 BootFilter、启动服务并连接桥接通道。
4. 如果任一步骤失败，使用驱动环境检测的按项修复并刷新。

本地开发签名不受目标系统信任时，只能在可恢复的测试机或一次性虚拟机中按组织策略启用测试签名。正式安装包必须使用可信生产签名，不能要求最终用户降低系统签名策略。
