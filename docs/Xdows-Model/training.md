---
title: Training and Evaluation
description: Xdows Model's training tools, sample specifications, dataset splitting, hyperparameter configuration, recommended-threshold calibration, and batch evaluation flow.
---

# Training and Evaluation {#Training}

This document describes how to train models with `Xdows-Model-Maker` and how to perform batch evaluation with `Xdows-Model-Evaluator`. For model architecture and feature contracts, see [Architecture](./architecture).

## Sample Specification {#Samples}

Default sample directories come from `TrainingConfig`:

- Black samples (malicious): `D:\Code\Model\Files\Black`
- White samples (safe): `D:\Code\Model\Files\White`

Files in both directories should be PE files (`.exe`, `.dll`, etc.). Sample file names do not require a specific format, but it is recommended to store them by family or source for traceability.

For Pro training, each sample may additionally carry three optional metadata fields that make the evaluation honest:

| Field | Purpose |
| --- | --- |
| `GroupKey` | Malware family or campaign identifier. Samples sharing a `GroupKey` are kept on the same side of the split so near-duplicates cannot leak from the test set into the training set. |
| `TimeKey` | Sample collection time. Required when `ProSplitMode` is `TimeOrdered`. |
| `ContentHash` | SHA-256 of the file content, computed by the splitter for deduplication. |

:::caution[Safety Notice]
Do not commit real malware samples to the repository. `Xdows-Model\tests\samples\README.md` describes the storage and usage specification for safe samples. Black samples used for training should be placed outside the repository and excluded via `.gitignore`.
:::

## Training Tool {#Maker}

`Xdows-Model-Maker` is an interactive menu tool:

```powershell
dotnet run --project D:\Code\Xdows-Model\Xdows-Model-Maker
```

The menu has mode checkboxes plus these actions:

- Start training (trains every checked mode in turn)
- Start sample cleaning and statistics
- **Copy artifacts to the invoker** — copies the freshly trained ONNX files, the Pro manifest, and the recommended-threshold manifests into `Xdows-Model-Invoker\Models\`, so the Invoker picks them up without a manual copy step
- Exit

Pro training trains the five branch models (Standard / Flash / RawStat / Structural / ImportBehavior) in turn, uses their Out-of-Fold probabilities to train the Fusion logistic regression model, and finally outputs 6 ONNX files plus `Xdows-Model-Pro.manifest.json`. The artifact list is derived from `ProBranches` and `ProModelManifest` rather than hard-coded, so a newly added branch cannot be silently left out of the copy step.

### Dataset Splitting {#Splitter}

Pro uses `ProDatasetSplitter` instead of a naive random split:

1. **Content-hash deduplication** (`ProDeduplicateByContentHash`, default on) removes byte-identical samples first. Duplicates would otherwise land in both the training and the test set and inflate the reported metrics.
2. **Group isolation** (`ProEnforceGroupIsolation`, default on) keeps every sample sharing a `GroupKey` entirely on one side. Samples without a `GroupKey` degrade to one group per sample, and the split report states plainly that group isolation was not effective.
3. **Split strategy** (`ProSplitMode`): `StratifiedRandom` (default) keeps the class ratio in both halves; `TimeOrdered` sorts by `TimeKey` and puts the newest segment into the test set, and fails explicitly when a sample has no `TimeKey` rather than silently degrading.
4. **Report**: the splitter prints the class distribution of both halves and the deduplication and isolation statistics.

The outer test fraction is `ProTestFraction` (default `0.2`) and must lie strictly between 0 and 1.

## Hyperparameters {#Hyperparameters}

Key hyperparameters are defined in `TrainingConfig.cs` and can be modified before training:

### Common {#HyperCommon}

| Parameter | Default | Description |
| --- | --- | --- |
| `RandomSeed` | 43846 | Global random seed, ensuring reproducibility |
| `FalsePositiveCostRatio` | 2.65 | How many false negatives one false positive is worth; drives both threshold selection and sample weighting |
| `UseCostSensitiveThreshold` | `true` | Calibrate the recommended threshold automatically instead of using the fixed one |
| `UseCostSensitiveTrainingWeight` | `true` | Propagate the false-positive cost into the LightGBM positive-class weight |

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
| `StandardThreshold` | 92.0 | Fixed detection threshold (percentage) |

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
| `FlashThreshold` | 96.0 | Fixed detection threshold (percentage) |

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
| `ProMaxParallelBranches` | 4 | Cap on branch parallelism |
| `ProTestFraction` | 0.2 | Outer test-set fraction |
| `ProSplitMode` | `StratifiedRandom` | `StratifiedRandom` or `TimeOrdered` |
| `ProThreshold` | 94.0 | Fixed detection threshold (percentage) |

Pro's Fusion model uses logistic regression and has no independent GBDT hyperparameters.

## Recommended Threshold Calibration {#RecommendedThreshold}

Every mode ships a recommended threshold alongside its ONNX file:

- Standard → `Xdows-Model.threshold.json`
- Flash → `Xdows-Model-Flash.threshold.json`
- Pro → `Xdows-Model-Pro.threshold.json`, mirrored into `Xdows-Model-Pro.manifest.json`

The value is chosen at training time with a cost-sensitive objective (one false positive is charged as `FalsePositiveCostRatio` false negatives) and recorded with the selection method. It defines the lower bound of the `Suspicious` band and never overrides the fixed threshold in `TrainingConfig`. The manifest is written next to both the ML.NET model and the exported ONNX file; only when `UseCostSensitiveThreshold` is on.

## Model Output {#Output}

After training completes, model files are output to the path specified by `TrainingConfig`:

| Mode | Output files |
| --- | --- |
| Standard | `Xdows-Model.zip` + `Xdows-Model.onnx` + `Xdows-Model.threshold.json` |
| Flash | `Xdows-Model-Flash.zip` + `Xdows-Model-Flash.onnx` + `Xdows-Model-Flash.threshold.json` |
| Pro | `Xdows-Model-Pro.zip` + `Xdows-Model-Pro.onnx` + 5 branch `.onnx` files (`-Standard`, `-Flash`, `-RawStat`, `-Structural`, `-ImportBehavior`) + `Xdows-Model-Pro.manifest.json` + `Xdows-Model-Pro.threshold.json` |

Pro defaults to outputting a 5-input Fusion model plus 5 branch models, and the Invoker enables the five-branch Stacking path after validating the manifest. A legacy four-branch model (4-input Fusion, 519-dimensional hybrid input, no manifest) still loads through the compatibility path; a 5143-dimensional single model without branches takes the single-model fallback path.

Use **Copy artifacts to the invoker** in the Maker menu to place the whole set into `Xdows-Model-Invoker\Models\`. The Pro model, its five branch models, and its manifest must be deployed together — a five-input Fusion model without its manifest is rejected by the Invoker.

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

`tests\Invoke-NativeConsistency.ps1` scans the same batch of safe PE samples through both the managed caller and the native DLL for Standard, Flash, Pro, and Adaptive:

```powershell
& 'D:\Code\Xdows-Model\tests\Invoke-NativeConsistency.ps1' -SkipBuild
```

Both sides must agree on the three-tier verdict (`Clean` / `Suspicious` / `Malware`) and on the threat decision, and the probability difference must stay within the configured tolerance. Because the verdict depends on the recommended threshold, the script also asserts that the required model files are present — the five Pro branch models, `Xdows-Model-Pro.manifest.json`, and the three `*.threshold.json` manifests.

After modifying the feature extraction or inference logic on either the Invoker or Native side, you must run this test once to ensure both sides reach consistent conclusions.
