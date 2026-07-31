---
title: Xdows Security 5
description: Xdows Security 5 快速开始、下载与首次运行指南。
---

# 快速开始 {#GetStarted}

Xdows Security 5 是使用 WinUI 3 和 C# 构建的开源 Windows 安全防护产品，按照 MIT 许可证发布。它同时提供用户态 R3 防护和驱动支持的 R0 防护，使用自研的 Xdows Model 本地模型进行恶意文件检测。

## 下载与首次运行 {#Download}

1. 从 [Releases](https://github.com/XTY64XTY/Xdows-Security-5/releases) 下载最新版本的 `Xdows-Security.zip`。
2. 将压缩包完整解压到本地目录。不要只复制 `Xdows-Security.exe`，驱动包、BootFilter 和原生模型资源必须保留原有目录结构。
3. 运行 `Xdows-Security.exe`。使用扫描功能不一定需要管理员权限；安装、启动、修复或停止驱动时必须以管理员身份运行。
4. 需要 R0 防护时，在设置中启用驱动防护。程序会检查环境、安装主驱动与 BootFilter，并建立通信。
5. 如果启用失败，请打开驱动环境检测，按照检查组提供的修复操作处理后刷新。

<LinkCard url="https://github.com/XTY64XTY/Xdows-Security-5/releases" title="下载 Xdows Security 5" description="https://github.com/XTY64XTY/Xdows-Security-5/releases" logo="/logo.ico"/>
<LinkCard url="https://qm.qq.com/q/ybEtoc5rFe" title="进入 QQ 群" description="https://qm.qq.com/q/ybEtoc5rFe" logo="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAACE4AAAhOAFFljFgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAUpSURBVHgB7Z1fdhM3FMY/jUvbx+kKGFYAO2hYQWEFJA9NyulD6QpIVtD0KQ15SFgB2UHZQWEFHVaAeeOEeMS9M55gJtiJJV2NJOt3TmI7k+PxzKf7R5Z0BWQymUwmk8lsIgqhc6K30OABfdL79OoBNEp6rAb/VdPxKR2r6flbTPCGfl5jR00ROGEKwDdd4wn9PKJXJUxRJALwEndwHqoYYQlwpLdR4Dmut3BbanrfM1ySGE9VjYAIQ4DOzRzSs/uQhV3VAXbVGQJhfAGO9V/0+xl8wq5php0QrGE8AU51iU94RX5+C+NQk9U9HFuEcQQ40hX55H/h3tevy5TuwENySW8wEv4F4JZ/gf8w/s3vGVWEAr65wCnCuflMSW7wVWuVI+BXgBPNKeYjhEdFHbdTjIA/F9T5/f8RNgfYU/vwiD8L6IJu6Dz37Yr8CMA93LD8/nI8uyI/AnRfL8QB90uOqGfuCXkBYmr9PRN/DUZegJhaf49HK5AV4FhzylkhRiZ+0mVpCwgx578dPB7BvXZh5AToPvwTxEuJjzQCJ4ycABejfcvpDg9uSNIFxet+ejR+gTByAijx0S0fVNI9YxkB2P9ref/phYmsK5UR4DKRm98hei0yAjQJCdDI9mNkBNCRdr6+hXAskxGgSCIA91QQRCoLEu9BekUwE8ou6DZM5BpUtoDbMItPgLSYyFm0ewE8fIOYEu4F+JiY+xHGvQCBTf8OnRwDRsa9ACNN8RNFx5QFFdhGaii5cQEJFxTzMOS3EZwl4VaAmGdB3ITQ8KRbAVSC7qdHaJaEOwE4+HoYQx0RXliyDce4EyDF4DtEIBi7dEHpBd8hAsHYjQApB98hjoOxGwFSDr5DHAdjewHSD75DnAZjFxawhU3DYTC2X6R3rHnhXYVN43v85KICi50FvNA8/6fCJnLhpr6FnQDac5GNkFD4GQ6wjQFOPkSUOOoTmAtw0p68wiZT2Ccg5gLMEpj/b4sDN2QuQLHB7qenc0MVLDAToOt8pTQF3ZzCzhOYWsAWMh2WFb/MBJhk/3+FZRwwE0AnNf3clnLeITVifQE2ufe7DAs3tL4AqU09d4HFKhoTF3STudVIEYXlRf0sMsL1BVArTtbggI7XSJEZ/lxxtIIhJhZwd8nfazxV+9Qa3iE9pnRtr+na/l5yvDTtkLmLAVyFtmO0Iqhi9O7nB+xjmYs1XMZkYgHXT8Sup5+W3iQoAO9JwPAAzCUegy1iyMyfAEPOW9fT82MrgPVIUVDM6Bp7fm8r7B7AESYCLN5cLoD9dXDiVqKSsoK69f+L7KnDFfFgLWwEWF59fOauhYxOtwvHdX5TzwbHahhgIsDL9sSrSr93LaZGCqxqTHcoHnSWUJsuzZIrXdxtRzJKPWZnKJxhV+1AENna0bFPWWlwT3rRoewivQairUeUxdRaEPnq6f/oQzrLH4iLmjKde/CArAUw3HuMKy2dLvTqxZEXgPsFs7b3WCMOvO6uJC8AwxfUtaoaIcMxa0+dwyN+N/EJZ/ek6zRtyz+DZ76DL77sDxlmMY8JfbYXGr73nZS1AF5JckkZUNMuaKgQB/V8p73I09Buf8jQtqxaj4IyuF+V6PdaMgLwdlVNO3gRP2wNu0osLXUvQLdT3nukxWOp7EgqDa2REo3cAJOMC+rSTd6GnDOfu/RYLowll1hdVXGKxUEfNX+t2z0f+fmH9nkzF7mYv6+i83CGpebv/fXY9U3nZOqr8+mrLdLf0nnOcxWwTCaTyWQyGdd8Bo6GXoI3yXTbAAAAAElFTkSuQmCC"/>

:::note
如果 GitHub 无法访问或下载缓慢，可通过 QQ 群获取发布包。
:::

:::info
BootFilter 是独立的存储过滤驱动，但它随 Xdows Security 驱动包一同发布，并随“驱动防护”整体启停。R0 引导防护和 R0 注册表防护都没有单独开关。
:::

## 接下来 {#Next}

- [保护能力](./protection) — 了解 R0/R3 防护边界、开关策略和扫描引擎
- [驱动环境检测](./driver-environment) — 四项检查组说明和修复操作
- [构建与安装](./build) — 从源码构建和驱动安装指南
- [故障排查](./troubleshooting) — 常见问题与安全验证边界

## 版权说明 {#License}

该项目使用 MIT 许可证，详情请参阅 [LICENSE](https://github.com/XTY64XTY/Xdows-Security-5/blob/main/LICENSE.txt)。
