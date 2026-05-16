# Xdows-Model

> 项目仓库：<https://github.com/XTY64XTY/Xdows-Model>

Xdows-Model 是一个基于 **LightGBM**（通过 ML.NET 实现）训练、并以 **ONNX Runtime** 推理的恶意文件扫描模型项目。当前版本为 **v2**，使用 C# 实现，按职责拆分为三个子项目。

## 项目结构

| 子项目 | 说明 |
|--------|------|
| `Xdows-Model-Caller` | 最小调用示例，演示如何在业务程序中接入模型推理 |
| `Xdows-Model-Invoker` | 推理核心库，包含模型加载、特征提取与扫描推理 |
| `Xdows-Model-Maker` | 训练工具，包含数据加载、特征提取、模型训练与 ONNX 导出 |

### Xdows-Model-Invoker

推理核心库，提供以下功能：

- `ModelInvoker`：模型初始化、加载与推理，支持线程安全的单例模式
- `FeatureExtractor`：文件特征提取与 PE 文件格式识别

### Xdows-Model-Maker

训练工具，提供以下功能：

- `DataLoader`：并行加载黑/白样本文件，支持非 PE 文件自动清洗
- `FeatureExtractor`：与 Invoker 共享相同的特征提取逻辑
- `ModelTrainer`：基于 ML.NET LightGBM 的二分类模型训练与评估
- `TrainingConfig`：训练超参数配置

### Xdows-Model-Caller

最小调用示例，展示如何通过命令行参数扫描单个文件：

```
Xdows-Model-Caller.exe <文件路径>
```

## 推理流程

`Xdows-Model-Invoker` 的核心流程如下：

### 1. 模型准备

默认模型文件名为 `Xdows-Model.onnx`，按以下优先级查找：

1. 运行目录（`AppContext.BaseDirectory`）
2. 嵌入资源（从程序集提取并写入运行目录）
3. 程序集所在目录（复制到运行目录）

若均未找到，则抛出 `FileNotFoundException`。

### 2. 文件校验

- 检查目标文件是否存在
- 通过 `MZ` 与 `PE` 头判断是否为 PE 文件，非 PE 文件直接抛出 `NotSupportedException`

### 3. 特征提取

提取 **279 维**特征（`FeatureCount = 279`），具体包括：

| 特征类别 | 维度 | 说明 |
|----------|------|------|
| 字节频率 | 256 | 每个字节值（0x00–0xFF）在文件中的出现频率 |
| 文件大小 | 1 | 对数变换 `log(fileSize + 1)` |
| 全局熵 | 1 | 整个文件的 Shannon 熵 |
| 分块熵统计 | 8 | 最小/最大/均值/方差、最小/最大熵块位置、首/末块熵 |
| 字节分布 | 5 | 唯一字节数、最常见字节及其占比、最不常见字节及其占比 |
| 字符比例 | 5 | 可打印字符、控制字符、空白字符、字母、数字 |
| 零字节特征 | 2 | 零字节占比、最长零字节连续段 |
| 高字节比例 | 1 | 0x80–0xFF 字节占比 |

### 4. ONNX 推理

- 输入：`Features`（1×279 特征张量）与 `Label`（布尔标签占位）
- 输出：读取 `Probability.output`，乘以 100 换算为百分比

### 5. 判定结果

当 `probability >= 90.0f` 时判定为恶意文件。

## 快速接入（C#）

```csharp
using Xdows_Model_Invoker;

// 初始化模型（不传路径时使用默认模型发现策略）
ModelInvoker.Initialize();

// 扫描文件
var (isVirus, probability) = ModelInvoker.ScanFile(@"C:\test\sample.exe");
Console.WriteLine($"IsVirus: {isVirus}, Probability: {probability:F2}%");

// 释放模型资源
ModelInvoker.UnloadModel();
```

也可以在扫描时指定模型路径：

```csharp
var (isVirus, probability) = ModelInvoker.ScanFile(@"C:\test\sample.exe", @"C:\models\Xdows-Model.onnx");
```

## 训练流程

使用 `Xdows-Model-Maker` 训练模型：

1. **准备样本**：将黑样本放入 `Black` 目录，白样本放入 `White` 目录
2. **清洗数据**：运行 Maker 选择「清洗非PE文件」，自动删除非 PE 格式的样本
3. **训练模型**：选择「训练模型」，程序将自动完成以下步骤：
   - 并行加载所有样本并提取特征
   - 按 80/20 比例划分训练集与测试集
   - 训练 LightGBM 二分类模型
   - 输出评估指标（准确率、AUC、AUPRC、F1 分数、混淆矩阵）
   - 保存 ML.NET 模型（`.zip`）与 ONNX 模型（`.onnx`）

### 训练配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| LearningRate | 0.1 | 学习率 |
| NumberOfLeaves | 31 | 叶节点数 |
| MinimumExampleCountPerLeaf | 20 | 叶节点最小样本数 |
| NumberOfIterations | 400 | 迭代次数 |
| RandomSeed | 42 | 随机种子 |

## 依赖

- **.NET 10.0**
- [Microsoft.ML](https://www.nuget.org/packages/Microsoft.ML/) 5.0.0
- [Microsoft.ML.OnnxRuntime](https://www.nuget.org/packages/Microsoft.ML.OnnxRuntime/) 1.26.0
- [Microsoft.ML.LightGBM](https://www.nuget.org/packages/Microsoft.ML.LightGBM/) 5.0.0（仅 Maker）

## 适用场景

- 在杀毒/安全工具中提供本地静态文件预筛
- 在样本分析流水线中做第一层风险打分
- 与签名检测、行为检测组合为多引擎策略

## 注意事项

- 当前推理流程仅支持 **PE 文件**，非 PE 文件会被拒绝
- `90%` 阈值是业务策略值，建议按实际样本集进行校准
- 生产环境建议补充：扫描超时控制、模型版本管理、日志与审计
- 项目基于 MIT 协议开源
