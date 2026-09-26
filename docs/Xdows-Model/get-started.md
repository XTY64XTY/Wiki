---
title: Xdows Model
description: Xdows Model is the local malicious-file model repository for Xdows Security, providing four ONNX inference modes (Standard, Flash, Pro, and Adaptive), a five-branch Pro Stacking ensemble, training tools, evaluation tools, and a native runtime.
---

# Xdows Model

Xdows Model is the local static-scanning model repository for Xdows Security. It trains GBDT models with ML.NET LightGBM, runs inference with ONNX Runtime, and provides a managed invoker library, a command-line caller, a batch evaluation tool, and a C ABI native runtime invoked by the Xdows Security driver-protection path.

## Model Modes {#Modes}

The repository currently maintains four inference modes:

| Mode | Entry model | Use case | Feature dimension | Default detection threshold |
| --- | --- | --- | --- | --- |
| Standard | `Xdows-Model.onnx` | Default static scan, balances accuracy and speed | 299 | 92% |
| Flash | `Xdows-Model-Flash.onnx` | Fast pre-screening, reads only file head and tail | 68 | 96% |
| Pro | `Xdows-Model-Pro.onnx` plus five branch models | High-cost deep static scan, 5-branch Stacking ensemble | 5143 | 94% |
| Adaptive | Flash + Standard + Pro | Tiered routing, escalating on demand | Dynamic | Inherits each tier's threshold |

Pro mode is not a single model but a **5-branch Stacking ensemble**:

- Standard branch: 299-dimensional full PE/byte-statistics features
- Flash branch: 68-dimensional head/tail region features
- RawStat branch: 120-dimensional (3 segments × 40 dimensions) fixed raw byte statistics
- Structural branch: 32-dimensional PE structure features
- ImportBehavior branch: 4624-dimensional import-behavior features (512 DLL hash buckets + 4096 API hash buckets + 16 import-table statistics)
- Fusion model: 5-dimensional (OOF probabilities of the five branches), fusing the final probability with logistic regression

Pro's total feature dimension is fixed at **5143** (299 + 68 + 120 + 32 + 4624), constrained by the `FeatureSchema` constant; there is no "dynamic raw byte expansion". When loading Pro, the Invoker reads the Fusion model's input dimension: if the dimension is **5**, it validates `Xdows-Model-Pro.manifest.json` and enables the five-branch Stacking path; if the dimension is **4**, it takes the legacy four-branch path, which loads `-Standard`, `-Flash`, `-RawStat`, and `-Structural` without a manifest; if the dimension is **5143** (or the legacy **519**), it takes the single-model path and feeds the hybrid features directly into the Fusion model itself.

Adaptive mode routes tier by tier in the order **Flash → Standard → Pro**:

1. First use Flash for a quick decision; if the probability is in the safe zone (`probability ≤ 100 − FlashThreshold`), release it directly;
2. Otherwise escalate to Standard for a new decision; if it is still in the safe zone, release it;
3. Otherwise escalate to Pro for the final decision.

This ensures an extremely low false-positive rate while only paying the Flash cost for the vast majority of safe files.

## Verdicts {#Verdicts}

All modes and all three implementations (managed Invoker, native runtime, and the Rust invoker) share one three-tier verdict:

| Verdict | Meaning | Condition |
| --- | --- | --- |
| `Clean` | No threat | `probability` below the recommended threshold |
| `Suspicious` | Needs attention | `probability` at or above the recommended threshold and below the fixed threshold |
| `Malware` | Threat | `probability` at or above the fixed threshold |

The recommended threshold comes from the `<model>.threshold.json` manifest shipped next to each model and never overrides the fixed threshold. Legacy boolean callers can keep reading `IsThreat`, which is true for anything other than `Clean`.

## Repository Layout {#Projects}

| Project | Role |
| --- | --- |
| `Xdows-Model-Config` | Training paths, model output paths, thresholds, hyperparameters, the `FeatureSchema` constants, the `ProBranches` layout authority, and the `ProModelManifest` contract |
| `Xdows-Model-Maker` | Interactive training and sample-cleaning tool, supporting Standard, Flash, and Pro (including the five-branch Stacking), plus content-hash deduplication and group-isolated dataset splitting |
| `Xdows-Model-Invoker` | Managed inference library, responsible for model loading, feature extraction, ONNX inference, and threshold decisions |
| `Xdows-Model-Caller` | Command-line sample caller, supporting the four modes `-s`, `-f`, `-p`, and `-a` |
| `Xdows-Model-Evaluator` | Batch evaluation tool, outputting accuracy, TPR, FPR, average scan time, and a misjudged-samples CSV |
| `Xdows-Model-Native` | C ABI native wrapper, called directly by the Xdows Security main app in the driver-protection path; supports both the five-branch and the legacy four-branch Pro layout |

See [Architecture](./architecture) for detailed mode architecture, feature contracts, and routing flow. A separate Rust port of the invoker library lives in the `Xdows-Model-Invoker-Rust` repository; see [Rust Invoker](./rust-invoker).

## Command-Line Caller {#CLI}

```powershell
Xdows-Model-Caller.exe [-s|-f|-p|-a] [--model <模型路径>]
```

The mode flags are mutually exclusive:

- `-s`: use the Standard model (default)
- `-f`: use the Flash model
- `-p`: use the Pro model
- `-a`: use the Adaptive mode

`--model` can specify a model file path; in Adaptive mode it can specify a directory containing all models. Without `--model`, the default model file in the runtime directory is used. The directory accepted by Adaptive mode should contain the three base models Standard, Flash, and Pro; if Pro is in the Stacking form, it must also contain the Pro branch model files and the Pro manifest.

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

Each initialization method can accept an optional model path parameter. Adaptive mode accepts a model directory, which should contain all three base model files, plus the Pro branch models and the Pro manifest when Pro is in the Stacking form.

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

The native runtime decides the Pro layout from the Fusion model's input dimension, exactly like the managed Invoker: `5` loads the five branches including `-ImportBehavior` with a 5143-dimensional hybrid input, and `4` keeps the legacy four-branch 519-dimensional behaviour. Any other dimension is rejected at initialization instead of silently degrading during a scan.

## Deployment Assets {#Assets}

Models are no longer embedded in the assembly. `Xdows-Model-Invoker` keeps them in a dedicated `Models` directory (source: `Xdows-Model-Invoker\Models\`, build output: `Models\` next to `Xdows-Model-Invoker.dll`), copies them with `PreserveNewest`, and looks in that directory first, falling back to the assembly directory only for deployments created before this layout existed.

When publishing Xdows Security, the app output must include the whole model set:

- `Xdows-Model.onnx` and `Xdows-Model.threshold.json`
- `Xdows-Model-Flash.onnx` and `Xdows-Model-Flash.threshold.json`
- `Xdows-Model-Pro.onnx`, `Xdows-Model-Pro.threshold.json`, and `Xdows-Model-Pro.manifest.json`
- The five Pro branch models (`-Standard`, `-Flash`, `-RawStat`, `-Structural`, `-ImportBehavior`)
- `Xdows-Model-Native.dll`
- `onnxruntime.dll`
- `onnxruntime_providers_shared.dll`

A Pro model set deployed without its manifest fails to load: the Invoker refuses a five-input Fusion model that has no manifest rather than guessing the branch layout.

## Notes {#Notes}

- Do not commit real malware samples to the repository. See `tests\samples\README.md` for the safe-sample specification.
- Pro's feature dimension is fixed at 5143, constrained by the `FeatureSchema` constant; when updating Pro training, do not hard-code the branch dimensions to other values.
- The Pro branch dimensions, offsets, file suffixes, order, and layout fingerprint have a single authoritative source in `Xdows-Model-Config\ProBranches.cs`. Do not write a second copy of that table in the Maker or the Invoker.
- The feature layout is append-only. New feature groups may only be appended to the end of the vector; existing offsets must not move.
- Thresholds are business policy, not part of the model itself; the fixed thresholds stay in `TrainingConfig`, while the recommended thresholds are calibrated at training time and shipped as `*.threshold.json`.
- The native runtime and the managed Invoker must use the same set of model files, feature contracts, and threshold configuration.
- Modifying `FeatureSchema` will break compatibility with old models and require retraining all modes; bump `FeatureSchema.Version` so the manifest rejects stale models instead of the code silently changing rules.

## License {#License}

This project uses the MIT license; see [LICENSE](https://github.com/XTY64XTY/Xdows-Model/blob/main/LICENSE.txt) for details.
