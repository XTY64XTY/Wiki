# Main.dll

## 簡介

Main.dll 為 Xdows Tools 實際呼叫的DLL

Xdows Tools 通過呼叫這個DLL來實現外掛功能

Main.dll 通常是在 `外掛名\Files\Main.dll` 文件

## 注意

在編譯DLL時盡量選擇目標 Xdows Security 的架構（一般為 x86 架構）

不同的架構可能會導致執行**效率慢**或**崩潰**問題

> [!IMPORTANT] 重要
> 以下DLL程式中的必須存在
>
> 如果不存在，程式將會崩潰


## SetUIHtml

|    名稱   |  返回類型 |注明                                    |
| :-------- | :------- | :-------------------------------------- |
| SetUIHtml |   文字   |該函數定義在 Xdows Tools 中載入的 Html 文件|

該函數沒有參數，如有參數則程式崩潰

::: code-group

```cpp[C++]
// 由 DeepSeek 翻譯，可能需要進行修改

#include <string>
#include <fstream>
#include <filesystem>

std::string SetUIHtml() {
    // 請把 "Name" 替換為外掛名，把 "HtmlFiles" 替換為需要顯示的 Html 文件名
    using namespace std::filesystem;
    auto path = current_path() / "Plugins\\Name\\Files\\HtmlFiles.html";
    return std::string(std::istreambuf_iterator<char>(std::ifstream(path).rdbuf()),
                        std::istreambuf_iterator<char>() );
}
```

```c[C]
// 由 DeepSeek 翻譯，可能需要進行修改

#include <windows.h>
#include <stdio.h>

char* SetUIHtml() {
    // 請把 "Name" 替換為外掛名，把 "HtmlFiles" 替換為需要顯示的 Html 文件名
    char path[MAX_PATH];
    sprintf(path, "%s\\Plugins\\Name\\Files\\HtmlFiles.html",
            GetModuleHandle(NULL) ? "" : ""); // 獲取當前目錄的巧妙方式

    HANDLE hFile = CreateFileA(path, GENERIC_READ, FILE_SHARE_READ, NULL,
                              OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
    if (hFile == INVALID_HANDLE_VALUE) return NULL;

    DWORD size = GetFileSize(hFile, NULL);
    char* buf = (char*)malloc(size + 1);
    ReadFile(hFile, buf, size, &size, NULL);
    buf[size] = 0;
    CloseHandle(hFile);
    return buf;
}

/* 使用後需 free() 釋放記憶體 */
```

```py[Python]
# 由 DeepSeek 翻譯，可能需要進行修改

import os

def set_ui_html() -> str:
    # 請把 "Name" 替換為外掛名，把 "HtmlFiles" 替換為需要顯示的 Html 文件名，把 "utf-8" 替換為文件編碼
    file_path = os.path.join(os.getcwd(), "Plugins", "Name", "Files", "HtmlFiles.html")
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()
```

```EPL[易語言]
.版本 2

.子程序 SetUIHtml, 文字型, 公開

' 請把 "Name" 替換為外掛名，把 "HtmlFiles" 替換為需要顯示的 Html 文件名
返回 (到文字 (讀入文件 (取運行目錄 () ＋ "\Plugins\Name\Files\HtmlFiles.html")))
```

```txt
// 示例偽代碼，可能需要根據實際需求調整

函數 SetUIHtml 返回 文字型
    定義 文件路徑 = 目前目錄 + "\Plugins\Name\Files\HtmlFiles.html"
    打開 文件路徑 為 唯讀
    如果 文件存在
        返回 讀取文件內容
    否則
        返回 空文字
    結束
結束函數
```

:::



## SetUITitle


|    名稱    |  返回類型 |注明                               |
| :--------- | :-------- | :-------------------------------- |
| SetUITitle |    文字   |該函數定義在 Xdows Tools 中顯示的標題|

該函數沒有參數

::: code-group

```c[C++/C]
// 由 DeepSeek 翻譯，可能需要進行修改

const char* SetUITitle() {
 return "PluginsTitle";
}

```

```py[Python]
# 由 DeepSeek 翻譯，可能需要進行修改

def SetUITitle():
 return "PluginsTitle"

```

```txt
// 示例偽代碼，可能需要根據實際需求進行調整。

函數 SetUITitle 返回 文字型
    返回 "PluginsTitle"
結束函數
```

:::



## GetInfo


|    名稱   |  返回類型 |注明                                                    |
| :-------- | :------- | :------------------------------------------------------ |
| GetInfo   |    文字  |該函數定義在 Xdows Tools 功能主頁 顯示的簡介|

該函數沒有參數，如有參數則程式崩潰

::: code-group

```c[C++/C]
// 由 DeepSeek 翻譯，可能需要進行修改

const char* GetInfo() {
 return "PluginsInfo";
}

```

```py[Python]
# 由 DeepSeek 翻譯，可能需要進行修改

def GetInfo():
 return "PluginsInfo"

```

```txt
.版本 2

.子程序 GetInfo, 文字型, 公開

返回 ("PluginsInfo")

```

```txt
// 示例偽代碼，可能需要根據實際需求進行調整。

函數 GetInfo 返回 文字型
    返回 "PluginsInfo"
結束函數
```

:::



## ScanFiles

> [!IMPORTANT] 重要
> 該函數將在之後啟用
>
> 為保證相容新版本，建議編寫

|    名稱    |  返回類型 |注明                               |
| :--------- | :-------- | :-------------------------------- |
| ScanFiles  |    文字   |該函數用於在掃描文件時外掛添加的額外引擎|

如果未檢測到病毒或選擇忽略此功能請返回空文字

如果檢測到病毒請返回病毒名稱

該函數的參數如下

| 名稱 |  類型 |注明|
| :--- | :--- | :----------------------------------- |
| Path | 文字 |預掃描的文件名稱。不可空，無需處理相關問題|

## Html檔案內呼叫

你可以使用 Http 訪問來呼叫DLL

``` js
const Http = new XMLHttpRequest();
Http.open("GET", '/Function/外掛名-調用函數/?參數1=參數內容&參數2=參數內容',false);
Http.send();

```

> [!IMPORTANT] 重要
> 參數最多只能有 2 個
>
> 多餘參數將會被忽略
>
> 呼叫的DLL函數返回值必須為 文字 型（不需要可返回空文字），參數必須為 文字 型
>
> 其它類型將會崩潰