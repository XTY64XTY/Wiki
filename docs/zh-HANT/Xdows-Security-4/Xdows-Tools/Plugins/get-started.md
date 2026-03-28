::: warning 注意
該版本已過時。建議查看最新的 [Xdows Security 4.1](/zh-HANT/Xdows-Security-4.1/get-started) 版本。
:::

# 外掛系統

## 簡介

外掛系統 旨在為 Xdows Tools 提供更輕便、簡潔的擴展功能

## 區別

外掛系統源於 Xdows Security 3.01

那時候外掛系統集成於 本體 而非 Xdows Tools

外掛在 3.0 本質上是一個 dll 文件，本體會在某些操作時調用 dll 達到外掛的效果

在 Xdows Security 3.03 時進行過更新，支援外掛當作掃描引擎使用

在 Xdows Security 3.04 外掛系統因為各種原因被**移除**

在 Xdows Security 4.00 中外掛系統重新回歸並集成在 Xdows Tools 中

## 外掛

4.0 版本外掛系統 是集成在 Xdows Tools 中而非本體

意味著這將**失去**對 本體 的部分訪問權限，但也提高了安全性和穩定性

外掛的本質是一個存放設定檔、程式文件和附屬網頁文件的目錄

在目錄內通常包含以下內容

 - `Plugins` 目錄，存放外掛本體，一般為**不可更改**狀態
 - `Data` 目錄，存放外掛所需的數據

## 外掛包

外掛包 (Plugin Packages) 是一個包含一個或多個的外掛的 ZIP 壓縮包

你可以在 `Xdows Tools` - `匯入外掛` 進行匯入外掛包