---
title: Xdows Model
description: Xdows Model is the local malicious-file model repository for Xdows Security, providing four ONNX inference modes (Standard, Flash, Pro, and Adaptive), training tools, evaluation tools, and a native runtime.
---

# Xdows Model

Xdows Model is the local static-scanning model repository for Xdows Security. It trains GBDT models with ML.NET LightGBM, runs inference with ONNX Runtime, and provides a managed invoker library, a command-line caller, a batch evaluation tool, and a C ABI native runtime invoked by the Xdows Security driver-protection path.

## Model Modes {#Modes}

The repository currently maintains four inference modes:

| Mode | Entry model | Use case | Feature dimension | Default detection threshold |
| --- | --- | --- | --- | --- |
| Standard | `Xdows-Model.onnx` | Default static scan, balances accuracy and speed | 299 | 92% |
| Flash | `Xdows-Model-Flash.onnx` | Fast pre-screening, reads only file head and tail | 68 | 96% |
| Pro | `Xdows-Model-Pro.onnx` plus four branch models | High-cost deep static scan, 4-branch Stacking ensemble | 519 | 94% |
| Adaptive | Flash + Standard + Pro | Tiered routing, escalating on demand | Dynamic | Inherits each tier's threshold |

Pro mode is not a single model but a **4-branch Stacking ensemble**:

- Standard branch: 299-dimensional full PE/byte-statistics features
- Flash branch: 68-dimensional head/tail region features
- RawStat branch: 120-dimensional (3 segments × 40 dimensions) fixed raw byte statistics
- Structural branch: 32-dimensional PE structure features
- Fusion model: 4-dimensional (OOF probabilities of the four branches), fusing the final probability with logistic regression

Pro's total feature dimension is fixed at **519** (299 + 68 + 120 + 32), constrained by the `FeatureSchema` constant; there is no "dynamic raw byte expansion". When loading Pro, the Invoker reads the Fusion model's input dimension: if the dimension is **4**, it enables the Stacking ensemble path and loads the four branch models; if the dimension is **519**, it takes the single-model path and feeds the hybrid features directly into the Fusion model itself.

Adaptive mode routes tier by tier in the order **Flash → Standard → Pro**:

1. First use Flash for a quick decision; if the probability is in the safe zone (`probability ≤ 100 − FlashThreshold`), release it directly;
2. Otherwise escalate to Standard for a new decision; if it is still in the safe zone, release it;
3. Otherwise escalate to Pro for the final decision.

This ensures an extremely low false-positive rate while only paying the Flash cost for the vast majority of safe files.

## Repository Layout {#Projects}

| Project | Role |
| --- | --- |
| `Xdows-Model-Config` | Training paths, model output paths, thresholds, hyperparameters, and the `FeatureSchema` constants |
| `Xdows-Model-Maker` | Interactive training and sample-cleaning tool, supporting Standard, Flash, and Pro (including Stacking) |
| `Xdows-Model-Invoker` | Managed inference library, responsible for model loading, feature extraction, ONNX inference, and threshold decisions |
| `Xdows-Model-Caller` | Command-line sample caller, supporting the four modes `-s`, `-f`, `-p`, and `-a` |
| `Xdows-Model-Evaluator` | Batch evaluation tool, outputting accuracy, TPR, FPR, average scan time, and a misjudged-samples CSV |
| `Xdows-Model-Native` | C ABI native wrapper, called directly by the Xdows Security main app in the driver-protection path |

See [Architecture](./architecture) for detailed mode architecture, feature contracts, and routing flow.

## Command-Line Caller {#CLI}

```powershell
Xdows-Model-Caller.exe [-s|-f|-p|-a] [--model <模型路径>]
```

The mode flags are mutually exclusive:

- `-s`: use the Standard model (default)
- `-f`: use the Flash model
- `-p`: use the Pro model
- `-a`: use the Adaptive mode

`--model` can specify a model file path; in Adaptive mode it can specify a directory containing all models. Without `--model`, the default model file in the runtime directory is used. The directory accepted by Adaptive mode should contain the three base models Standard, Flash, and Pro; if Pro is in the Stacking form, it must also contain the four Pro branch model files.

Examples:

```powershell
Xdows-Model-Caller.exe
Xdows-Model-Caller.exe -p
Xdows-Model-Caller.exe -a --model "D:\Models"
```

After initialization, the caller enters interactive mode: enter file paths repeatedly to scan them, enter `Help` for help, and enter `Quit` to exit.

## C# Integration {#CSharp}

```csharp
using Xdows_Model_Config;
using Xdows_Model_Invoker;

ModelInvoker.ConfigureThresholds(new TrainingConfig());

// Choose one initialization as needed
ModelInvoker.Initialize();        // Standard
ModelInvoker.InitializeFlash();   // Flash
ModelInvoker.InitializePro();     // Pro
ModelInvoker.InitializeAdaptive(); // Adaptive

var (isVirus, probability) = ModelInvoker.ScanFile(@"C:\Samples\app.exe");

ModelInvoker.UnloadModel();
```

Each initialization method can accept an optional model path parameter. Adaptive mode accepts a model directory, which should contain all three base model files (if Pro is in the Stacking form, it must also contain the four branch models).

## Native Runtime {#Native}

The Xdows Security main app does not run .NET models through the driver, nor does it launch the command-line scanner through the driver. In the driver-protection path, the main app loads `Xdows-Model-Native.dll`, and the native runtime then calls ONNX Runtime to perform local inference.

Core C ABI interfaces (all functions use the `__stdcall` calling convention and are exported via the `XDOWS_MODEL_NATIVE_API` macro):

```c
typedef enum {
    XdowsModelNativeModeStandard = 0,
    XdowsModelNativeModeFlash    = 1,
    XdowsModelNativeModePro      = 2,
    XdowsModelNativeModeAdaptive = 3
} XDOWS_MODEL_NATIVE_MODE;

XDOWS_MODEL_NATIVE_API int  __stdcall XdowsModelNativeInitialize(const wchar_t* modelDirectory, int mode, void** session);
XDOWS_MODEL_NATIVE_API int  __stdcall XdowsModelNativeScanFile(void* session, const wchar_t* filePath, XDOWS_MODEL_NATIVE_SCAN_RESULT* result);
XDOWS_MODEL_NATIVE_API void __stdcall XdowsModelNativeShutdown(void* session);
XDOWS_MODEL_NATIVE_API void __stdcall XdowsModelNativeFreeString(wchar_t* value);
```

When publishing Xdows Security, the app output should include:

- `Xdows-Model.onnx`
- `Xdows-Model-Flash.onnx`
- `Xdows-Model-Pro.onnx` and the four branch models (`-Standard`, `-Flash`, `-RawStat`, `-Structural`)
- `Xdows-Model-Native.dll`
- `onnxruntime.dll`
- `onnxruntime_providers_shared.dll`

## Notes {#Notes}

- Do not commit real malware samples to the repository. See `tests\samples\README.md` for the safe-sample specification.
- Pro's feature dimension is fixed at 519, constrained by the `FeatureSchema` constant; when updating Pro training, do not hard-code the branch dimensions to other values.
- Thresholds are business policy, not part of the model itself; they should be re-evaluated against the target sample set before release.
- The native runtime and the managed Invoker must use the same set of model files, feature contracts, and threshold configuration.
- Modifying `FeatureSchema` will break compatibility with old models and require retraining all modes.

## License {#License}

This project uses the MIT license; see [LICENSE](https://github.com/XTY64XTY/Xdows-Model/blob/main/LICENSE.txt) for details.
