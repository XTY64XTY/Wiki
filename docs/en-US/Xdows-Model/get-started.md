---
title: Xdows Model
description: Xdows Model is a malicious-file scanning model project based on LightGBM, ML.NET, and ONNX Runtime, covering structure, inference, training, and C# integration.
---

# Xdows-Model

> Repository: <https://github.com/XTY64XTY/Xdows-Model>

Xdows-Model is a malicious-file scanning model project trained with **LightGBM** (via ML.NET) and executed with **ONNX Runtime**. The current version is **v2**, implemented in C# and split by responsibilities across managed training, managed inference, evaluation, and a native runtime bridge.

## Project Structure

| Sub-project | Description |
|-------------|-------------|
| `Xdows-Model-Config` | Shared paths, thresholds, and model hyperparameter configuration |
| `Xdows-Model-Caller` | Minimal invocation sample demonstrating how to integrate model inference into your application |
| `Xdows-Model-Evaluator` | Evaluation and smoke-test helper |
| `Xdows-Model-Invoker` | Inference core library, including model loading, feature extraction, and scanning |
| `Xdows-Model-Maker` | Training tool, including data loading, feature extraction, model training, and ONNX export |
| `Xdows-Model-Native` | Native C ABI wrapper used by Xdows Security driver protection |

### Xdows-Model-Invoker

The inference core library provides:

- `ModelInvoker`: Model initialization, loading, and inference with thread-safe singleton support
- `FeatureExtractor`: File feature extraction and PE format detection

### Xdows-Model-Maker

The training tool provides:

- `DataLoader`: Parallel loading of malicious/benign sample files with automatic non-PE file cleanup
- `FeatureExtractor`: Shares the same feature extraction logic as the Invoker
- `ModelTrainer`: ML.NET LightGBM-based binary classification model training and evaluation
- `TrainingConfig`: Training hyperparameter configuration

### Xdows-Model-Caller

Minimal invocation sample that scans a single file via command-line argument:

```
Xdows-Model-Caller.exe <file-path>
```

## Inference Flow

The `Xdows-Model-Invoker` pipeline is as follows:

### 1. Model Preparation

The default model file name is `Xdows-Model.onnx`, discovered in the following priority order:

1. Runtime directory (`AppContext.BaseDirectory`)
2. Embedded resource (extracted from the assembly and written to the runtime directory)
3. Assembly directory (copied to the runtime directory)

If none are found, a `FileNotFoundException` is thrown.

### 2. File Validation

- Confirms the target file exists
- Validates PE files by `MZ` and `PE` headers; non-PE files throw a `NotSupportedException`

### 3. Feature Extraction

Standard mode extracts **299 features** (`FileFeatures.FeatureCount = 299`), including byte statistics, entropy, PE layout, section, import/export, and header-derived signals. Flash mode extracts **68 features** for fast head/tail scanning. Pro mode uses a hybrid vector:

- Standard features: 299 dimensions
- Flash features: 68 dimensions
- PE structure features: 32 dimensions
- Raw section bytes: dynamically sized from the Pro model's ONNX `Features` input dimension

The Pro path derives the raw bytes-per-section value from the loaded `Xdows-Model-Pro.onnx` metadata. Do not hard-code one fixed Pro feature count; retrained Pro models can carry a different valid `Features` dimension.

| Feature Category | Dimensions | Description |
|-----------------|------------|-------------|
| Byte frequency | 256 | Occurrence frequency of each byte value (0x00–0xFF) |
| File size | 1 | Log-transformed `log(fileSize + 1)` |
| Global entropy | 1 | Shannon entropy of the entire file |
| Block entropy statistics | 8 | Min/max/mean/variance, min/max entropy block positions, first/last block entropy |
| Byte distribution | 5 | Unique byte count, most common byte and ratio, least common byte and ratio |
| Character ratios | 5 | Printable, control, whitespace, alphabetic, numeric |
| Zero/high-entropy features | 2 | Zero-byte ratio, high-entropy block ratio |
| Extended byte/run statistics | 16 | Byte mean/variance, distribution skewness/kurtosis, zero/non-zero run counts and lengths, low/printable/extended ASCII ratios |
| PE header summary | 4 | Section count, timestamp, characteristics, optional-header magic |
| Header entropy summary | 4 | Min/max/mean/variance for the file header region |

### 4. ONNX Inference

- Inputs: `Features` and `Label` (boolean placeholder). Standard uses 299 dimensions, Flash uses 68 dimensions, and Pro derives its dimension from the loaded ONNX model.
- Output: Reads `Probability.output` and multiplies by 100 to convert to percentage

### 5. Decision Output

A file is classified as malicious when `probability >= 90.0f`.

## Quick Integration (C#)

```csharp
using Xdows_Model_Invoker;

// Initialize model (uses default model discovery when path is omitted)
ModelInvoker.Initialize();

// Scan file
var (isVirus, probability) = ModelInvoker.ScanFile(@"C:\test\sample.exe");
Console.WriteLine($"IsVirus: {isVirus}, Probability: {probability:F2}%");

// Release model resources
ModelInvoker.UnloadModel();
```

You can also specify a model path when scanning:

```csharp
var (isVirus, probability) = ModelInvoker.ScanFile(@"C:\test\sample.exe", @"C:\models\Xdows-Model.onnx");
```

## Training Flow

Train a model using `Xdows-Model-Maker`:

1. **Prepare samples**: Place malicious samples in the `Black` directory and benign samples in the `White` directory
2. **Clean data**: Run the Maker and select "Clean non-PE files" to automatically remove non-PE samples
3. **Train model**: Select "Train model" and the program will automatically:
   - Load all samples in parallel and extract features
   - Split into 80/20 training and test sets
   - Train a LightGBM binary classification model
   - Output evaluation metrics (accuracy, AUC, AUPRC, F1 score, confusion matrix)
   - Save the ML.NET model (`.zip`) and ONNX model (`.onnx`)

### Training Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| LearningRate | 0.1 | Learning rate |
| NumberOfLeaves | 31 | Number of leaves |
| MinimumExampleCountPerLeaf | 20 | Minimum samples per leaf node |
| NumberOfIterations | 400 | Number of iterations |
| RandomSeed | 42 | Random seed |

## Dependencies

- **.NET 10.0**
- [Microsoft.ML](https://www.nuget.org/packages/Microsoft.ML/) 5.0.0
- [Microsoft.ML.OnnxRuntime](https://www.nuget.org/packages/Microsoft.ML.OnnxRuntime/) 1.26.0
- [Microsoft.ML.LightGBM](https://www.nuget.org/packages/Microsoft.ML.LightGBM/) 5.0.0 (Maker only)

## Typical Use Cases

- Local static pre-screening in antivirus/security tools
- First-layer risk scoring in malware analysis pipelines
- Multi-engine strategy combined with signature and behavior-based detection

## Notes

- The current inference flow only supports **PE files**; non-PE files are rejected
- The `90%` threshold is a policy value and should be calibrated with your own sample set
- For production usage, it is recommended to add: scan timeout control, model version management, logging and audit
- The project is open-sourced under the MIT license
