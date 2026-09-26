---
title: 驱动环境检测
description: Xdows Security 5 驱动环境检测的四项检查组、修复操作和测试签名说明。
---

# 驱动环境检测 {#DriverEnvironment}

驱动环境检测将状态合并为四组。主驱动与 BootFilter 在同一组内分别显示状态，但这不表示它们可以单独开启。

## 检查组 {#Groups}

| 检查组 | 检查内容 | 常见处理 |
|-------|---------|---------|
| 运行权限 | 当前进程是否具有管理员权限 | 以管理员身份重新启动 Xdows Security |
| 驱动签名与系统策略 | 开发环境的测试签名状态，以及驱动包当前的发布范围 | 开发环境使用可恢复测试机；当前发布范围是开发与测试机签名，不包含生产 EV、attestation 或 HLK 签名流程 |
| 双驱动包及服务 | 主驱动和 BootFilter 的 INF、SYS、CAT 包及对应服务 | 保留完整发布目录，使用按项修复重新安装或启动 |
| 双驱动通信与模型资源 | 主驱动通信、BootFilter 通信和原生模型资源 | 启动服务、修复包或重新生成完整解决方案输出 |

## 修复操作 {#Repair}

修复操作完成后，环境检测会重新检查对应状态。签名检查为警告并不一定表示正式签名驱动不可用：系统信任的正式签名无需依赖测试签名模式。

## 手动检查 {#Inspection}

应用会自行安装并启动驱动，但在测试机上也可以用提权的 PowerShell 会话检查同样的状态：

```powershell
sc query Xdows-Security-Driver
pnputil /enum-drivers | findstr /i Xdows
```

源码构建后预期的驱动包目录为：

```text
D:\Code\Xdows-Security-Driver\x64\Debug\Xdows-Security-Driver
```

其中包含 `Xdows-Security-Driver.inf`、`Xdows-Security-Driver.sys` 和 `xdows-security-driver.cat`。首次安装请优先使用主程序流程，让 `Root\XdowsSecurityDriver` 根设备在绑定驱动包之前就已创建；`pnputil /add-driver ... /install` 后接 `sc start Xdows-Security-Driver` 适用于该设备已存在后的升级或诊断。

:::caution
测试签名仅用于开发和测试。不要把启用测试签名模式作为正式部署方案。在开发机上通过 `bcdedit /set testsigning on` 启用并重启，且只能在一次性虚拟机或可恢复的测试机上进行。
:::
