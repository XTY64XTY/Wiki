# Xdows-Model

> Repository: <https://github.com/XTY64XTY/Xdows-Model>

Xdows-Model is a malicious-file scanning model project built around a **LightGBM-style** workflow and executed with **ONNX Runtime**. The repository is implemented in C# and split by responsibilities into caller, invoker, and maker modules.

## Project Structure

- `Xdows-Model-Caller`
  - Minimal invocation sample (`Program.cs`) for integrating the model into your own application.
- `Xdows-Model-Invoker`
  - Inference core library, including:
    - `ModelInvoker`: model initialization, loading, and scanning;
    - `FeatureExtractor`: file feature extraction and PE format detection.
- `Xdows-Model-Maker`
  - Data preparation and training-related code (such as `DataLoader`, `ModelTrainer`, and `Program`).

## Inference Flow (Invoker)

The `Xdows-Model-Invoker` pipeline is:

1. **Model preparation**
   - Default model file name is `Xdows-Model.onnx`.
   - It first checks the runtime directory, then tries embedded resources, and finally attempts to copy from the assembly directory.
2. **File validation**
   - Confirms the target file exists before scanning.
   - Validates PE files by `MZ` and `PE` headers; unsupported file types are rejected.
3. **Feature extraction**
   - Extracts 279 features (`FeatureCount = 279`), including:
     - 256 byte-frequency features;
     - file size (log-transformed);
     - global/block entropy statistics (min/max/mean/variance/positions);
     - printable/control/whitespace/alphabetic/numeric ratios;
     - zero-byte related metrics (ratio and longest contiguous run).
4. **ONNX inference**
   - Uses inputs `Features` (feature tensor) and `Label` (boolean placeholder).
   - Reads output from `Probability.output` and converts it to percentage.
5. **Decision output**
   - Current logic marks a file as malicious when `probability >= 90.0f`.

## Quick Integration (C#)

> This is an integration pattern. Please use the exact namespaces from the repository source.

```csharp
using Xdows_Model_Invoker;

// Optional: explicit initialization (uses default model discovery when path is omitted)
ModelInvoker.Initialize();

// Scan file
var result = ModelInvoker.ScanFile(@"C:\\test\\sample.exe");
Console.WriteLine($"IsVirus: {result.isVirus}, Probability: {result.probability:F2}%");

// Release model resources before exit
ModelInvoker.UnloadModel();
```

## Typical Use Cases

- Local static pre-screening in antivirus/security tools;
- First-layer risk scoring in malware analysis pipelines;
- Multi-engine strategy with signature and behavior-based detection.

## Notes

- The current inference flow mainly targets **PE files**; non-PE files are rejected.
- The `90%` threshold is a policy value and should be calibrated with your own sample set.
- For production usage, it is recommended to add:
  - scan timeout control;
  - model version management;
  - logging and audit records.
