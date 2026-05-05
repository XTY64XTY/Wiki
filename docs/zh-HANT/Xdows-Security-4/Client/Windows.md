# Windows 用戶端


## 簡介 {#Info}
從 `Xdows Security 4.0 Beta-7` 開始添加了 `Windows` 平台的用戶端

用戶端使用 `ACF瀏覽器框架` 製作

::: details 關於 ACF瀏覽器框架
源作者：Admenri

相關說明：在使用此專案時請注意相關協議

相關連結：[這裡](https://bbs.125.la/forum.php?mod=viewthread&tid=14845602)
:::

## 開發者工具 {#DevTools}

在正常狀態下，用戶端禁止彈出右鍵選單，也不能使用快捷鍵如 `F12` `Ctrl Shift J` 來開啟 `開發者工具`

你可以點擊標題列圖示右邊的按鈕（如上圖），點擊後可能需要等待幾秒才會開啟 `開發者工具`

![開發者工具開啟按鈕](./../PNG/Client-Windows-DevTools.png)

> [!IMPORTANT] 找不到這個按鈕？
> 如果你的顏色模式為 `深色模式`
>
> 這個按鈕將會被隱藏，請切換為 `淺色模式` 以繼續

## 用戶端通訊 {#Communication}

在 `用戶端` 的瀏覽器環境中可以通過 `Client` 類與其通訊

其中可以通過 `postMessage` 讓執行用戶端介面，相關調用方式如下：

```js
if (top.getBrowserType() == 'Client'){
	Client.postMessage(
		"函數名",
		"參數1",
        "參數2",
        "參數3",
        "..."
	);
};
```

### ChangeTheme {#ChangeTheme}

此函數用於修改用戶端視窗主題（相關顏色），相關範例：

```js
if (top.getBrowserType() == 'Client'){
	Client.postMessage(
		"ChangeTheme",
		"參數1",// --Background-color 變數內容
		"參數2",// --Text-color 變數內容
		"參數3",// --Theme-color 變數內容
		"參數4",// --Theme-Background-color 變數內容
		"參數5" // light 或 dark
	);
};
```