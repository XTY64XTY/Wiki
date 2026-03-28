::: warning 注意
此版本已過期。建議查看最新的 [Xdows Security 4.1](/zh-HANT/Xdows-Security-4.1/get-started) 版本。
:::

# 建立外掛套件

## 壓縮軟體

理論上，您可以使用幾乎任何支援 ZIP 壓縮的軟體。

不過，建議使用開放原始碼軟體 `7-Zip`，因為它具有高效的壓縮演算法和廣泛的相容性。

本文使用基於 `7-Zip` 的 `NanaZip`。

其他軟體可能有不同的介面，但步驟大致相似。

## 準備外掛內容

在壓縮之前，確保外掛目錄結構正確。標準外掛目錄結構如下：

```
PluginName/
├── Data/
│   └── ...
└── Files/
    ├── Main.dll
    └── ...
```

確保 `Main.dll` 檔案位於 `Files` 資料夾中，並且所有必要的資料檔案都儲存在 `Data` 資料夾中。

## 壓縮外掛目錄

1. 右鍵點擊外掛目錄並選擇 `加入壓縮檔`。

2. 在彈出視窗中，選擇以下選項：

   - 壓縮格式：zip
   - 壓縮等級：等級 1（快速壓縮，適用於外掛套件）

   ![Screenshot1-NanaZip](./../../PNG/Pack-1.png)

   以下是其他壓縮軟體的範例截圖：

   ::: details Windows 檔案總管
      ![Screenshot1-Windows-Explorer](./../../PNG/Pack-1-1.png)
   :::
   ::: details WinRAR
      ![Screenshot1-WinRAR](./../../PNG/Pack-1-2.png)
   :::

3. 確認選項並點擊 `確定` 開始壓縮。

## 驗證壓縮結果

壓縮後，檢查產生的 ZIP 檔案是否具有以下目錄結構：

```
Plugin.zip
├── PluginName/
│   ├── Data/
│   │   └── ...
│   └── Files/
│       ├── Main.dll
│       └── ...
```

您可以透過解壓縮檔案並檢查其內容來驗證這一點。

## 多外掛套件

只需選擇多個外掛並一起壓縮它們。結果應該如下所示：

```
Plugin.zip
├── PluginName1/
│   ├── Data/
│   │   └── ...
│   └── Files/
│       ├── Main.dll
│       └── ...
├── PluginName2/
│   ├── Data/
│   │   └── ...
│   └── Files/
│       ├── Main.dll
│       └── ...
└── ...
```

## 最後範例

以下是以 Process 外掛為例的壓縮套件內容截圖：

![Screenshot2](./../../PNG/Pack-2.png)

## 常見問題

1. 壓縮後檔案結構不正確
   - 檢查初始外掛目錄結構是否符合要求。
   - 確保在壓縮期間選擇了正確的選項。

2. 無法辨識 ZIP 檔案
   - 確保使用了 ZIP 格式。

3. 壓縮等級選擇
   - 等級 1 是建議的壓縮等級，平衡了速度和壓縮率。

4. 如何匯入外掛套件
   - 使用 `Xdows Tools` - `AddPlugins` 來匯入外掛套件。
