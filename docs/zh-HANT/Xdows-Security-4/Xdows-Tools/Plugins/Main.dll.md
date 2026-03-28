::: warning 注意
此版本已過期。建議查看最新的 [Xdows Security 4.1](/zh-HANT/Xdows-Security-4.1/get-started) 版本。
:::

# Main.dll

## 介紹

Main.dll 是 Xdows Tools 實際呼叫的 DLL。

Xdows Tools 使用此 DLL 來實現外掛功能。

Main.dll 通常位於 `PluginName\Files\Main.dll`。

## 注意

編譯 DLL 時，嘗試選擇 Xdows Security 的目標架構（通常是 x86）。

不同的架構可能會導致**效能緩慢**或**當機**問題。

> [!IMPORTANT] 重要
> 以下函數必須存在於 DLL 中。
> 
> 如果它們不存在，程式將會當機。

## SetUIHtml

|    名稱    | 傳回類型 | 說明                                      |
| :--------- | :-------- | :--------------------------------------- |
| SetUIHtml  |   文字     | 此函數在 Xdows Tools 中載入 Html 檔案。 |

此函數沒有參數。如果提供了參數，程式將會當機。

::: code-group

```cpp[C++]
// 由 DeepSeek 翻譯，可能需要修改。

#include <string>
#include <fstream>
#include <filesystem>

std::string SetUIHtml() {
    // 將 "Name" 取代為外掛名稱，將 "HtmlFiles" 取代為要顯示的 Html 檔案名稱。
    using namespace std::filesystem;
    auto path = current_path() / "Plugins\\Name\\Files\\HtmlFiles.html";
    return std::string(std::istreambuf_iterator<char>(std::ifstream(path).rdbuf()),
                        std::istreambuf_iterator<char>() );
}
```

```c[C]
// 由 DeepSeek 翻譯，可能需要修改。

#include <windows.h>
#include <stdio.h>

char* SetUIHtml() {
    // 將 "Name" 取代為外掛名稱，將 "HtmlFiles" 取代為要顯示的 Html 檔案名稱。
    char path[MAX_PATH];
    sprintf(path, "%s\\Plugins\\Name\\Files\\HtmlFiles.html", 
            GetModuleHandle(NULL) ? "" : ""); // 取得目前目錄的聰明方法
    
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

/* 使用後使用 free() 釋放記憶體 */
```

```py[Python]
# 由 DeepSeek 翻譯，可能需要修改。

import os

def set_ui_html() -> str:
    # 將 "Name" 取代為外掛名稱，將 "HtmlFiles" 取代為要顯示的 Html 檔案名稱，並將 "utf-8" 取代為檔案編碼。
    file_path = os.path.join(os.getcwd(), "Plugins", "Name", "Files", "HtmlFiles.html")
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()
```

```pseudo[虛擬碼]
// 範例虛擬碼，可能需要根據實際需求進行調整。

Function SetUIHtml Returns Text
    Define FilePath = CurrentDirectory + "\Plugins\Name\Files\HtmlFiles.html"
    Open FilePath As ReadOnly
    If FileExists
        Return ReadFileContent
    Else
        Return EmptyText
    End If
End Function
```

:::

## SetUITitle


|    名稱     | 傳回類型 | 說明                                  |
| :---------- | :-------- | :----------------------------------- |
| SetUITitle  |   文字     | 此函數設定在 Xdows Tools 中顯示的標題。 |

此函數沒有參數。

::: code-group

```c[C++/C]
// 由 DeepSeek 翻譯，可能需要修改。

const char* SetUITitle() {
    return "PluginsTitle";
}
```

```py[Python]
# 由 DeepSeek 翻譯，可能需要修改。

def SetUITitle():
    return "PluginsTitle"
```


```pseudo[虛擬碼]
// 範例虛擬碼，可能需要根據實際需求進行調整。

Function SetUITitle Returns Text
    Return "PluginsTitle"
End Function
```

:::

## GetInfo


|    名稱    | 傳回類型 | 說明                                  |
| :--------- | :-------- | :----------------------------------- |
| GetInfo    |   文字     | 此函數在 Xdows Tools 首頁上顯示說明。 |

此函數沒有參數。如果提供了參數，程式將會當機。

::: code-group

```c[C++/C]
// 由 DeepSeek 翻譯，可能需要修改。

const char* GetInfo() {
    return "PluginsInfo";
}
```

```py[Python]
# 由 DeepSeek 翻譯，可能需要修改。

def GetInfo():
    return "PluginsInfo"
```


```pseudo[虛擬碼]
// 範例虛擬碼，可能需要根據實際需求進行調整。

Function GetInfo Returns Text
    Return "PluginsInfo"
End Function
```

:::

## ScanFiles

> [!IMPORTANT] 重要
> 此函數將在未來版本中啟用。
> 
> 為了確保與新版本的相容性，建議實作它。

|    名稱     | 傳回類型 | 說明                                  |
| :---------- | :-------- | :----------------------------------- |
| ScanFiles   |   文字     | 此函數新增一個額外的引擎來掃描檔案。 |

如果未偵測到病毒或忽略此功能，請傳回空字串。

如果偵測到病毒，請傳回病毒名稱。

此函數的參數如下：

| 名稱 | 類型 | 說明                                  |
| :--- | :--- | :----------------------------------- |
| Path | 文字 | 要掃描的檔案名稱。不能為空。 |

## 在 Html 檔案中呼叫

您可以使用 HTTP 請求來呼叫 DLL。

```js
const Http = new XMLHttpRequest();
Http.open("GET", '/Function/PluginName-FunctionName/?Param1=Value1&Param2=Value2', false);
Http.send();
```

> [!IMPORTANT] 重要
> 最多允許 2 個參數。
>
> 多餘的參數將被忽略。
> 
> DLL 函數的傳回值必須是文字類型（如果不需要，可以傳回空字串）。參數也必須是文字類型。
>
> 其他類型將導致當機。
