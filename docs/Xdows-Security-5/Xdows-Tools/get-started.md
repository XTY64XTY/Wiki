---
title: Xdows Tools
description: The built-in toolset of Xdows Security 5, providing a process manager, command prompt, and popup blocker.
---

# Xdows Tools

Xdows Tools is the built-in toolset of Xdows Security, providing system management and security auxiliary functions. The product name is always written as `Xdows Tools` and is not translated.

The tool list is organized as tabs, with a sliding animation when switching tabs.

## Process Manager {#ProcessManager}

Manage processes running in the system.

### View Process List

- The list displays each process's **name, PID, thread count, handle count, and memory usage**.
- Supports switching between **list view** and **tree view**; tree view shows the parent-child process hierarchy.
- Supports **driver process** mode toggle: this mode uses the driver to obtain and operate on processes, and requires driver protection to be enabled first.
- A **search box** at the top filters processes by name or PID in real time.

### Sort

Supports sorting by the following fields:

- Name
- PID
- Memory
- Thread count
- Handle count

### Process Operations

Right-click a process to perform the following actions:

- **Refresh list**: Reload the process list
- **Details**: Double-click or right-click to open the process details panel
- **Suspend process**: Pause process execution
- **Resume process**: Resume a suspended process
- **Terminate process**: End the selected process

## Command Prompt {#CommandPrompt}

A built-in terminal tool that executes system commands without opening an external cmd.

- **Execute command**: Enter a command in the input box and press Enter or click the "Execute" button
- **Command history**: Use the up/down arrow keys (↑↓) to browse command history
- **Output area**: Displays command execution results, supports scrolling
- **Copy output**: Copy content from the output area to the clipboard

:::note
Xdows Security's application manifest already requires running as administrator, so the command prompt executes commands with administrator privileges.
:::

## Popup Blocker {#PopupBlocker}

Custom rules to block popups from specified window titles and processes.

### Master Switch

The toggle switch at the top controls the overall popup blocking:

- **Monitoring**: Rules are active, matching popups are automatically closed
- **Stopped**: All rules are paused, no blocking is performed

### Rule Management

The rule list displays each rule's **title, process name, status, and enabled state**. A search box at the top filters rules by keyword.

- **Add rule**: Add a blocking rule based on window title and process name
- **Edit rule**: Double-click a rule or right-click and select "Edit Rule" to modify an existing rule
- **Delete rule**: Right-click and select "Delete Rule" to remove an unwanted rule
- **Enable/Disable**: Control the toggle state of each rule individually
- **Rule status**: Displays the match count and current status of the rule

---
