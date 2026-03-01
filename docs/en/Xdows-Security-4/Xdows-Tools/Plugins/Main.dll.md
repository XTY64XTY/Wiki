::: warning NOTICE
This version is outdated. It is recommended to view the latest [Xdows Security 4.1](/en/Xdows-Security-4.1/get-started) version.
:::

# Main.dll

## Introduction

Main.dll is the DLL actually invoked by Xdows Tools.

Xdows Tools uses this DLL to implement plugin functionality.

Main.dll is usually located at `PluginName\Files\Main.dll`.

## Note

When compiling the DLL, try to select the target architecture of Xdows Security (usually x86).

Different architectures may cause **slow performance** or **crash** issues.

> [!IMPORTANT] Important
> The following functions must exist in the DLL.
> 
> If they do not exist, the program will crash.

## SetUIHtml

|    Name    | Return Type | Description                              |
| :--------- | :---------- | :--------------------------------------- |
| SetUIHtml  |    Text     | This function loads the Html file in Xdows Tools. |

This function has no parameters. If parameters are provided, the program will crash.

::: code-group

```cpp[C++]
// Translated by DeepSeek, may require modifications.

#include <string>
#include <fstream>
#include <filesystem>

std::string SetUIHtml() {
    // Replace "Name" with the plugin name and "HtmlFiles" with the Html file name to be displayed.
    using namespace std::filesystem;
    auto path = current_path() / "Plugins\\Name\\Files\\HtmlFiles.html";
    return std::string(std::istreambuf_iterator<char>(std::ifstream(path).rdbuf()),
                        std::istreambuf_iterator<char>() );
}
```

```c[C]
// Translated by DeepSeek, may require modifications.

#include <windows.h>
#include <stdio.h>

char* SetUIHtml() {
    // Replace "Name" with the plugin name and "HtmlFiles" with the Html file name to be displayed.
    char path[MAX_PATH];
    sprintf(path, "%s\\Plugins\\Name\\Files\\HtmlFiles.html", 
            GetModuleHandle(NULL) ? "" : ""); // Clever way to get the current directory
    
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

/* Use free() to release memory after usage */
```

```py[Python]
# Translated by DeepSeek, may require modifications.

import os

def set_ui_html() -> str:
    # Replace "Name" with the plugin name, "HtmlFiles" with the Html file name to be displayed, and "utf-8" with the file encoding.
    file_path = os.path.join(os.getcwd(), "Plugins", "Name", "Files", "HtmlFiles.html")
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()
```

```pseudo[Pseudocode]
// Example pseudocode, may need adjustments based on actual requirements.

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


|    Name     | Return Type | Description                          |
| :---------- | :---------- | :----------------------------------- |
| SetUITitle  |    Text     | This function sets the title displayed in Xdows Tools. |

This function has no parameters.

::: code-group

```c[C++/C]
// Translated by DeepSeek, may require modifications.

const char* SetUITitle() {
    return "PluginsTitle";
}
```

```py[Python]
# Translated by DeepSeek, may require modifications.

def SetUITitle():
    return "PluginsTitle"
```


```pseudo[Pseudocode]
// Example pseudocode, may need adjustments based on actual requirements.

Function SetUITitle Returns Text
    Return "PluginsTitle"
End Function
```

:::

## GetInfo


|    Name    | Return Type | Description                          |
| :--------- | :---------- | :----------------------------------- |
| GetInfo    |    Text     | This function displays the description on the Xdows Tools homepage. |

This function has no parameters. If parameters are provided, the program will crash.

::: code-group

```c[C++/C]
// Translated by DeepSeek, may require modifications.

const char* GetInfo() {
    return "PluginsInfo";
}
```

```py[Python]
# Translated by DeepSeek, may require modifications.

def GetInfo():
    return "PluginsInfo"
```


```pseudo[Pseudocode]
// Example pseudocode, may need adjustments based on actual requirements.

Function GetInfo Returns Text
    Return "PluginsInfo"
End Function
```

:::

## ScanFiles

> [!IMPORTANT] Important
> This function will be enabled in future versions.
> 
> To ensure compatibility with new versions, it is recommended to implement it.

|    Name     | Return Type | Description                          |
| :---------- | :---------- | :----------------------------------- |
| ScanFiles   |    Text     | This function adds an extra engine for scanning files. |

If no virus is detected or this feature is ignored, return an empty string.

If a virus is detected, return the virus name.

The parameters for this function are as follows:

| Name | Type | Description                          |
| :--- | :--- | :----------------------------------- |
| Path | Text | The name of the file to be scanned. Cannot be empty. |

## Calling in Html Files

You can use HTTP requests to call the DLL.

```js
const Http = new XMLHttpRequest();
Http.open("GET", '/Function/PluginName-FunctionName/?Param1=Value1&Param2=Value2', false);
Http.send();
```

> [!IMPORTANT] Important
> A maximum of 2 parameters is allowed.
>
> Extra parameters will be ignored.
> 
> The return value of the DLL function must be of type Text (can return an empty string if not needed). Parameters must also be of type Text.
>
> Other types will cause a crash.


