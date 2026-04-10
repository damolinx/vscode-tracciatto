# Tracciatto

Tracciatto is a Ruby debugger extension built on top of the `rdbg` debug adapter. 

## Table of Contents
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Commands](#commands)
- [Logs](#logs)

## Getting Started

Press F5 on any `.rb` file to automatically create debug configurations in `.vscode/launch.json`

### Launching a debug session

1. Add a `launch` configuration to `.vscode/launch.json`

    ```jsonc
    {
      "type": "tracciatto",
      "request": "launch",
      "name": "Debug current file",
      "program": "${file}"
    }
    ```

2. Press **F5** or run **Debug: Start Debugging**.

### Attaching to a running process

1. Add a `attach` configuration to `.vscode/launch.json`:

    ```jsonc
    {
      "type": "tracciatto",
      "request": "attach",
      "name": "Attach to Ruby process",
      "port": "12345"
    }
    ```

2. Launch the **Attach to Ruby process** debug configuration after starting your Ruby process in debug mode with `rdbg`.

[↑ Back to top](#table-of-contents)

## Configuration

## Configuration

Tracciatto supports the following user and workspace settings:

| Setting | Description |
|--------|-------------|
| `tracciatto.debug.skipPaths` | Additional skip‑path patterns applied when stepping in the Ruby debugger. Merged with launch configuration and project file patterns |
| `tracciatto.debug.skipPathsFileName` | Filename, relative to the workspace root, skip‑path patterns. Defaults to `.tracciatto-skip-filters` |
| `tracciatto.runtimeExecutable` | Path to the Ruby executable used for debugging. Default to `ruby`. |

[↑ Back to top](#table-of-contents)

### Skip‑paths

There are three possible sources for skip-paths, 

* **Launch configuration**: any `launch`-type configuration can define a list of patterns via the `skipPaths` property
  
  **Example**
  ```jsonc
  {
    "type": "tracciatto",
    "request": "launch",
    "program": "${file}",
    "skipPaths": ["lib/internal/"]
  }
  ```
* **Project files**: a file whose format is one pattern per line; with lines starting with `#` being ignored. File name is control using the `tracciatto.debug.skipPathsFileName` setting which defaults to `.tracciatto-skip-filters`.

  **Example**
  ```
  # Ignore Rails internals
  actionpack/
  activerecord/
  ```

* **Setting**: the `tracciatto.debug.skipPaths` further provides a place to add additional paths. 

All three sources can be used, they are merged and deduplicated, then passed to `rdbg` via `RUBY_DEBUG_SKIP_PATH` env variable.

[↑ Back to top](#table-of-contents)

## Commands

Tracciatto contributes the following commands:

- **Tracciatto: Debug Active Editor** : Starts a debug session using the active file or the selected configuration.

Commands are available via the Command Palette (`Ctrl/Cmd + Shift + P`).

[↑ Back to top](#table-of-contents)

## Logs

Tracciatto writes diagnostic information to the **Tracciatto** output channel.
You can adjust the log level using **Developer: Set Log Level** and selecting **Tracciatto**.
See [documentation](https://code.visualstudio.com/updates/v1_73#_setting-log-level-per-output-channel) for details.

[↑ Back to top](#table-of-contents)
