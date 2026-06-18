---
title: Xdows Model
description: Xdows Model is the local malicious-file model repository used by Xdows Security, providing Standard, Flash, and Pro ONNX inference modes, training, evaluation, and native runtime integration.
---

# Xdows Model

Xdows Model is the local static scanning model repository for Xdows Security. It trains models with ML.NET LightGBM, runs inference with ONNX Runtime, and provides a managed invoker, a command-line caller, an evaluator, and a native runtime used by the Xdows Security driver-protection path.

## Model Modes

The repository currently maintains three ONNX models:

| Mode | File | Purpose | Feature contract | Default threshold |
| --- | --- | --- | --- | --- |
| Standard | `Xdows-Model.onnx` | Default static scan | 299-dimensional full PE/byte-statistics feature set | 92% |
| Flash | `Xdows-Model-Flash.onnx` | Fast pre-screening | 68-dimensional head/tail feature set | 96% |
| Pro | `Xdows-Model-Pro.onnx` | Higher-cost deep static scan | Standard + Flash + 32 PE-structure features + dynamic raw section bytes | 94% |

Pro mode is not a fixed-dimension model. The Invoker reads the ONNX `Features` input dimension and derives the raw bytes-per-section value from it. After retraining a Pro model, callers do not need to hard-code a new feature length as long as the dimension can be parsed by the current hybrid feature contract.

## Repository Layout

| Project | Role |
| --- | --- |
| `Xdows-Model-Config` | Training paths, model output paths, thresholds, and hyperparameters |
| `Xdows-Model-Maker` | Interactive training and sample-cleaning tool for Standard, Flash, and Pro |
| `Xdows-Model-Invoker` | Managed inference library for model loading, feature extraction, ONNX inference, and threshold decisions |
| `Xdows-Model-Caller` | Command-line sample with `-s`, `-f`, and `-p` model selection |
| `Xdows-Model-Evaluator` | Batch evaluator that reports accuracy, TPR, FPR, average scan time, and optional hard-case CSV output |
| `Xdows-Model-Native` | C ABI native wrapper used by the Xdows Security main app in the driver-protection path |

## Inference Flow

1. Select a model mode and load the corresponding ONNX file.
2. Check that the target file exists.
3. Standard mode validates the PE header; Flash and Pro read the file through their own feature extractors.
4. Extract a `Features` tensor matching the current model mode.
5. Run ONNX Runtime and read `Probability.output`.
6. Apply the mode threshold from `TrainingConfig` and return a safe or malicious decision.

Default model discovery checks the runtime directory, embedded assembly resources, and the assembly directory. Production integrations should publish all three `.onnx` files with the ONNX Runtime native dependencies.

## Command-Line Caller

```powershell
Xdows-Model-Caller.exe <file-path> [-s] [-f] [-p]
```

The mode flags are mutually exclusive:

- `-s`: use the Standard model.
- `-f`: use the Flash model.
- `-p`: use the Pro model.

When no mode flag is provided, Standard is used.

## C# Integration

```csharp
using Xdows_Model_Config;
using Xdows_Model_Invoker;

ModelInvoker.ConfigureThresholds(new TrainingConfig());
ModelInvoker.InitializePro();

var (isVirus, probability) = ModelInvoker.ScanFile(@"C:\Samples\app.exe");

ModelInvoker.UnloadModel();
```

Use `Initialize()` for Standard, `InitializeFlash()` for Flash, and `InitializePro()` for Pro. Each initializer can also receive a custom ONNX path.

## Training And Evaluation

`Xdows-Model-Maker` is the interactive training tool. Default sample directories come from `TrainingConfig`:

- Malicious samples: `D:\Code\Model\Files\Black`
- Benign samples: `D:\Code\Model\Files\White`

The training menu can train one or more of Standard, Flash, and Pro. Pro training starts at `ProExpansionStartBytesPerSection`, expands the raw byte window by `ProExpansionFactor`, and stops when it reaches `ProExpansionMaxBytesPerSection`, the AUC gain falls below the configured threshold, or the patience limit is reached.

Batch evaluation example:

```powershell
dotnet run --project D:\Code\Xdows-Model\Xdows-Model-Evaluator -- --mode all --limit 700 --csv hard-cases.csv
```

Common options:

- `--mode all|standard|flash|pro`
- `--black <folder>`
- `--white <folder>`
- `--limit <n>`
- `--csv <path>`
- `--standard-model <path>`
- `--flash-model <path>`
- `--pro-model <path>`

## Relationship With Xdows Security

The Xdows Security main app does not run .NET model code inside the driver, and the driver does not start the command-line scanner. In the driver-protection path, the main app loads `Xdows-Model-Native.dll`, and that native runtime calls ONNX Runtime for local inference.

When publishing Xdows Security, the app output should include:

- `Xdows-Model.onnx`
- `Xdows-Model-Flash.onnx`
- `Xdows-Model-Pro.onnx`
- `Xdows-Model-Native.dll`
- `onnxruntime.dll`
- `onnxruntime_providers_shared.dll`

## Notes

- Do not commit live malware samples to the repository.
- Do not hard-code Pro to one fixed feature length when updating Pro training or inference.
- Thresholds are product policy, not part of the model itself; evaluate them against the target sample set before release.
- The native runtime and managed Invoker should use the same model files, feature contract, and threshold configuration.
