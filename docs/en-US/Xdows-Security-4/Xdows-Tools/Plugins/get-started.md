# Plugins

## Introduction

The plugin system aims to provide lightweight and concise extension functionality for Xdows Tools.

## Differences

The plugin system originated from Xdows Security 3.01.

At that time, the plugin system was integrated into the main program rather than Xdows Tools.

In version 3.0, plugins were essentially DLL files, and the main program would call the DLL during certain operations to achieve plugin functionality.

In Xdows Security 3.03, the plugin system was updated to support using plugins as scanning engines.

In Xdows Security 3.04, the plugin system was **removed** for various reasons.

In Xdows Security 4.00, the plugin system was reintroduced and integrated into Xdows Tools.

## Plugins

The plugin system in version 4.0 is integrated into Xdows Tools rather than the main program.

This means it **loses** some access to the main program but improves security and stability.

A plugin is essentially a directory containing configuration files, program files, and auxiliary web files.

The directory typically includes the following contents:

 - `Plugins` directory, which stores the plugin itself and is generally in a **non-editable** state.
 - `Data` directory, which stores the data required by the plugin.

## Plugin Packages

Plugin Packages are ZIP archives containing one or more plugins.

You can import plugin packages via `Xdows Tools` - `Import Plugins`.
