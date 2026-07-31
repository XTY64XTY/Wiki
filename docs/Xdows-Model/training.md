---
title: Training and Evaluation
description: Xdows Model's training tools, sample specifications, hyperparameter configuration, and batch evaluation flow.
---

# Training and Evaluation {#Training}

This document describes how to train models with `Xdows-Model-Maker` and how to perform batch evaluation with `Xdows-Model-Evaluator`. For model architecture and feature contracts, see [Architecture](./architecture).

## Sample Specification {#Samples}

Default sample directories come from `TrainingConfig`:

- Black samples (malicious): `D:\Code\Model\Files\Black`
- White samples (safe): `D:\Code\Model\Files\White`

Files in both directories should be PE files (`.exe`, `.dll`, etc.). Sample file names do not require a specific format, but it is recommended to store them by family or source for traceability.

:::caution[Safety Notice]
Do not commit real malware samples to the repository. `Xdows-Model\tests\samples\README.md` describes the storage and usage specification for safe samples. Black samples used for training should be placed outside the repository and excluded via `.gitignore`.
:::

## Training Tool {#Maker}

`Xdows-Model-Maker` is an interactive command-line training tool that displays a menu on startup:

```powershell
dotnet run --project D:\Code\Xdows-Model\Xdows-Model-Maker
```

The menu supports the following operations:

- Train the Standard model
- Train the Flash model
- Train the Pro model (including 4-branch Stacking)
- Train multiple modes at once
- Sample cleaning and statistics

Pro training trains the four branch models in turn (Standard / Flash / RawStat / Structural), then uses the Out-of-Fold probabilities to train the Fusion logistic regression model, ultimately outputting 5 ONNX files.

## Hyperparameters {#Hyperparameters}

Key hyperparameters are defined in `TrainingConfig.cs` and can be modified before training:

### Common {#HyperCommon}

| Parameter | Default | Description |
| --- | --- | --- |
| `RandomSeed` | 43846 | Global random seed, ensuring reproducibility |

### Standard {#HyperStandard}

| Parameter | Default | Description |
| --- | --- | --- |
| `LearningRate` | 0.025 | Learning rate |
| `NumberOfLeaves` | 127 | Number of leaves |
| `MinimumExampleCountPerLeaf` | 16 | Minimum samples per leaf node |
| `NumberOfIterations` | 1400 | Number of iterations |
| `StandardL1Regularization` | 0.02 | L1 regularization |
| `StandardL2Regularization` | 0.4 | L2 regularization |
| `StandardMaximumTreeDepth` | 10 | Maximum tree depth |
| `StandardFeatureFraction` | 0.9 | Feature sampling ratio |
| `StandardSubsampleFraction` | 0.85 | Sample subsampling ratio |
| `StandardTargetFalsePositiveRate` | 0.005 | Threshold-calibration target FPR |
| `StandardThreshold` | 92.0 | Detection threshold (percentage) |

### Flash {#HyperFlash}

| Parameter | Default | Description |
| --- | --- | --- |
| `FlashLearningRate` | 0.1 | Learning rate |
| `FlashNumberOfLeaves` | 31 | Number of leaves |
| `FlashMinimumExampleCountPerLeaf` | 8 | Minimum samples per leaf node |
| `FlashNumberOfIterations` | 800 | Number of iterations |
| `FlashL1Regularization` | 0.01 | L1 regularization |
| `FlashL2Regularization` | 0.2 | L2 regularization |
| `FlashMaximumTreeDepth` | 5 | Maximum tree depth |
| `FlashThreshold` | 96.0 | Detection threshold (percentage) |

### Pro {#HyperPro}

| Parameter | Default | Description |
| --- | --- | --- |
| `ProLearningRate` | 0.01 | Branch learning rate |
| `ProNumberOfLeaves` | 63 | Number of leaves |
| `ProMinimumExampleCountPerLeaf` | 10 | Minimum samples per leaf node |
| `ProNumberOfIterations` | 1200 | Branch iteration count |
| `ProL1Regularization` | 0.01 | L1 regularization |
| `ProL2Regularization` | 0.1 | L2 regularization |
| `ProMaximumTreeDepth` | 8 | Maximum tree depth |
| `ProFeatureFraction` | 0.85 | Feature sampling ratio |
| `ProSubsampleFraction` | 0.8 | Sample subsampling ratio |
| `ProThreshold` | 94.0 | Detection threshold (percentage) |

Pro's Fusion model uses logistic regression and has no independent GBDT hyperparameters.

## Model Output {#Output}

After training completes, model files are output to the path specified by `TrainingConfig`:

| Mode | Output files |
| --- | --- |
| Standard | `Xdows-Model.zip` + `Xdows-Model.onnx` |
| Flash | `Xdows-Model-Flash.zip` + `Xdows-Model-Flash.onnx` |
| Pro | `Xdows-Model-Pro.zip` + `Xdows-Model-Pro.onnx` + 4 branch `.onnx` files |

Pro defaults to outputting a 4-dimensional Fusion model plus 4 branch models; the Invoker automatically enables the Stacking ensemble path when loading. If only a 519-dimensional single model is exported (without branches), the Invoker takes the single-model fallback path and does not load the branch files.

## Batch Evaluation {#Evaluator}

`Xdows-Model-Evaluator` performs batch evaluation of a specified mode's model on a sample set, outputting accuracy, TPR, FPR, and average scan time, with an optional export of a misjudged-samples CSV.

```powershell
dotnet run --project D:\Code\Xdows-Model\Xdows-Model-Evaluator -- --mode all --limit 700 --csv hard-cases.csv
```

### Options {#EvaluatorOptions}

| Option | Description | Default |
| --- | --- | --- |
| `--mode <all\|standard\|flash\|pro>` | Evaluation mode | `all` |
| `--black <folder>` | Black sample directory | `TrainingConfig.BlackFolder` |
| `--white <folder>` | White sample directory | `TrainingConfig.WhiteFolder` |
| `--limit <n>` | Sample count per class | Full set |
| `--seed <n>` | Sampling seed | 42 |
| `--csv <path>` | Export only FP/FN/failed samples | Not exported |
| `--standard-model <path>` | Standard ONNX path | Default path |
| `--flash-model <path>` | Flash ONNX path | Default path |
| `--pro-model <path>` | Pro ONNX path | Default path |

### Output Metrics {#Metrics}

Each mode outputs the following metrics:

- **Accuracy**: accuracy = (TP + TN) / total
- **TPR**: True Positive Rate (recall) = TP / (TP + FN)
- **FPR**: False Positive Rate (false-alarm rate) = FP / (FP + TN)
- **F1**: F1 score = 2 × TP / (2 × TP + FP + FN)
- **AUC**: Area Under the ROC Curve (conditional output)
- **AUPRC**: Area Under the PR Curve (conditional output)
- **Average scan time**: average inference time per file
- **Failures**: number of samples that could not be evaluated due to PE validation failure, file read errors, etc.

The CSV export contains the fields `mode,path,label,prediction,probability,error` and records only FP, FN, and failed samples, used for troubleshooting hard cases.

## Native Consistency Test {#NativeConsistency}

`tests\Invoke-NativeConsistency.ps1` scans the same batch of safe PE samples through both the managed caller and the native DLL, comparing whether the two conclusions are consistent and whether the probability difference is within tolerance:

```powershell
& 'D:\Code\Xdows-Model\tests\Invoke-NativeConsistency.ps1' -SkipBuild
```

After modifying the feature extraction or inference logic on either the Invoker or Native side, you must run this test once to ensure both sides reach consistent conclusions.
