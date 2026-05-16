# Xdows-Model

> 项目仓库：<https://github.com/XTY64XTY/Xdows-Model>

Xdows-Model 是一个基于 **LightGBM** 思路构建、并以 **ONNX Runtime** 推理的恶意文件扫描模型项目。仓库目前以 C# 实现，按职责拆分为调用端、推理端与训练端。

## 项目结构

- `Xdows-Model-Caller`
  - 最小调用示例（`Program.cs`），用于演示如何在业务程序中接入模型。
- `Xdows-Model-Invoker`
  - 推理核心库，包含：
    - `ModelInvoker`：模型初始化、加载与推理；
    - `FeatureExtractor`：文件特征提取与 PE 文件识别。
- `Xdows-Model-Maker`
  - 模型数据与训练相关代码（如 `DataLoader`、`ModelTrainer`、`Program`）。

## 推理流程（Invoker）

`Xdows-Model-Invoker` 的核心流程如下：

1. **模型准备**
   - 默认模型文件名为 `Xdows-Model.onnx`。
   - 会优先在运行目录查找；若不存在，则尝试从嵌入资源提取；再尝试从程序集目录复制。
2. **文件校验**
   - 扫描前先检查目标文件是否存在。
   - 通过 `MZ` 与 `PE` 头判断是否为 PE 文件，不支持的类型直接报错。
3. **特征提取**
   - 提取 279 维特征（`FeatureCount = 279`），包括：
     - 256 维字节频率；
     - 文件大小（对数变换）；
     - 全局熵、分块熵统计（最小/最大/均值/方差/位置等）；
     - 可打印字符比例、控制字符比例、空白比例、字母/数字比例；
     - 0 字节相关特征（占比、最长连续段）等。
4. **ONNX 推理**
   - 输入名为 `Features`（特征张量）与 `Label`（布尔标签占位）。
   - 输出读取 `Probability.output`，并换算为百分比。
5. **判定结果**
   - 当前实现中，`probability >= 90.0f` 判定为病毒文件。

## 快速接入（C#）

> 以下为调用思路，具体命名空间请以仓库实际代码为准。

```csharp
using Xdows_Model_Invoker;

// 可选：显式初始化（不传路径时使用默认模型发现策略）
ModelInvoker.Initialize();

// 扫描文件
var result = ModelInvoker.ScanFile(@"C:\\test\\sample.exe");
Console.WriteLine($"IsVirus: {result.isVirus}, Probability: {result.probability:F2}%");

// 程序结束前可释放模型
ModelInvoker.UnloadModel();
```

## 适用场景

- 在杀毒/安全工具中提供本地静态文件预筛；
- 在样本分析流水线中做第一层风险打分；
- 与签名检测、行为检测组合为多引擎策略。

## 注意事项

- 当前推理流程主要面向 **PE 文件**；非 PE 文件会被拒绝。
- `90%` 阈值是业务策略值，建议按实际样本集进行校准。
- 若需要稳定发布，建议在上层补充：
  - 扫描超时控制；
  - 模型版本管理；
  - 日志与审计。
