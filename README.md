# Tracciatto

Tracciatto is a Ruby debugger extension built on top of the `rdbg` debug adapter.

## Table of Contents
- [Getting Started](#getting-started)
  - [Launching a debug session](#launching-a-debug-session)
  - [Attaching to a running process](#attaching-to-a-running-process)
  - [Compatibility with `rdbg` (vscode‑rdbg)](#compatibility-with-rdbg-vscoderdbg)
- [Configuration](#configuration)
  - [Skip frames](#skip-frames)
- [Commands](#commands)
- [Logs](#logs)

## Getting Started

Tracciatto integrates with `rdbg` to support the two main debugging workflows:

- **Launch**: VS Code starts Ruby under the debugger
- **Attach**: VS Code connects to an already running Ruby process started with `rdbg`

Press F5 on any `.rb` file to automatically create debug configurations in `.vscode/launch.json`

### Launching a debug session

Use this mode when you want VS Code to start Ruby for you.


1. Add a `launch` configuration to `.vscode/launch.json`

    ```jsonc
    {
      "type": "tracciatto",
      "request": "launch",
      "name": "Debug current file",
      // Using ${file} is convenient but often not what you want long-term.
      // Update this to point to your project's entrypoint script.
      "program": "${file}"
    }
    ```

2. Press **F5** or run **Debug: Start Debugging**.

### Attaching to a running process

Use this mode when Ruby is already running and you want the debugger to connect to it.

1. Start your Ruby program with `rdbg` in attach mode.

    **Example: Port mode**
    ```sh
    rdbg --open --port 12345 -- your_script.rb
    ```

    **Example: Socket mode**
    ```sh
    rdbg --open --sock-path /tmp/rdbg.sock -- your_script.rb
    ```

1. Add an `attach` configuration to `.vscode/launch.json`:

    **Example: Port mode**
    ```jsonc
    {
      "type": "tracciatto",
      "request": "attach",
      "name": "Attach to Ruby (port)",
      "port": "12345"
    }
    ```

    **Example: Socket mode**
    ```jsonc
    {
      "type": "tracciatto",
      "request": "attach",
      "name": "Attach to Ruby (socket)",
      "socket": "/tmp/rdbg.sock"
    }
    ```

2. Run the **Attach to Ruby** debug configuration.

[↑ Back to top](#table-of-contents)

#### Compatibility with `rdbg` (vscode‑rdbg)
This extension is compatible with the `rdbg` debug type provided by the
**vscode‑rdbg** extension. It supports both **launch** and **attach** modes, but accepts a a subset of configuration properties:
- `script` (required for launch)
- `args`, `command`, `cwd`, `env`
- `debugPort` (attach)
- `rdbgPath` (optional override for the `rdbg` executable)

To avoid conflicts, this built‑in `rdbg` support is **automatically disabled** whenever the
official `vscode‑rdbg` extension is installed and active. Otherwise this
extension registers a `rdbg` configuration provider and debug adapter.

[↑ Back to top](#table-of-contents)

## Configuration

Tracciatto supports the following user and workspace settings:

| Setting | Description | Default |
|--------|-------------|-------|
| `tracciatto.debug.skipPaths` | Additional skip‑path patterns applied when stepping in the Ruby debugger. Merged with launch configuration and project file patterns | |
| `tracciatto.debug.skipPathsFileName` | Filename, relative to the workspace root, skip‑path patterns. | `.tracciatto-skip-paths` |
| `tracciatto.runtimeExecutable` | Path to the Ruby executable used for debugging. | `ruby` |

[↑ Back to top](#table-of-contents)

### Skip frames

RDBG supports defining *skip‑paths*-glob patterns that tell the debugger which files it should not step into. This affects not only step-by-step debugging but also specific frames the debugger shows as part of the current callstack. For complex projects this is invaluable as there might be significant portions of the stack you do not care about at a given point in time, e.g. gem code.

Tracciatto aligns with this model by allowing skip‑paths to come from multiple sources. Patterns are merged and passed to `rdbg` via the `RUBY_DEBUG_SKIP_PATH` environment variable. There are three possible sources for skip‑paths:

#### **1. Launch configuration**

Any `launch`‑type configuration may define skip‑paths via the `skipPaths` property.

**Example `launch.json`**
```jsonc
{
  "type": "tracciatto",
  "request": "launch",
  "program": "${file}",
  "skipPaths": ["sorbet-runtime-*"]
}
```

#### **2. Workspace file**

A workspace‑level file containing one pattern per line, with lines beginning with `#` being ignored. The filename is controlled by `tracciatto.debug.skipPathsFileName` (default: `.tracciatto-skip-paths`).

##### Skip‑path pattern format

Skip‑paths use the same glob‑style matching rules as `rdbg`. These are evaluated against **absolute** file paths.

 Supported constructs:
- `*`: match within a single path segment
- `**`: match across directory boundaries
- `?`: match a single character
- `[abc]`: character classes

Comments (lines starting with `#`) and blank lines are allowed.

##### Examples

```
# Skip all Rails internals
actionpack/**
activerecord/**

# Skip Sorbet runtime files
sorbet-runtime-*

# Skip any file ending in _spec.rb
**/*_spec.rb

# Skip vendor bundle
vendor/bundle/**

# Skip a specific file
lib/internal/debug_helpers.rb
```

#### **3. Setting**

The `tracciatto.debug.skipPaths` setting provides an additional place to define skip‑paths, useful for global or personal preferences.

### Choosing where to define skip‑paths

Use this table to decide which source fits your workflow:

| Source | Scope | Best for | Notes |
|--------|--------|----------|-------|
| **Launch configuration** | Per debug session | Scenario‑specific exclusions | Lives in `launch.json` |
| **Workspace file** | Per project | Shared team rules or stable project‑level patterns | Version‑controlled; one pattern per line; **preferred** |
| **Setting** | Global or workspace | Personal preferences across all projects | Great for "always skip Rails internals" |

This layered approach provides maximum flexibility: global preferences, project‑level rules, and session‑specific overrides can all coexist cleanly.

#### Why multiple sources?

Different users and teams have different needs. You may always want to skip stepping into Rails internals across all projects, while each workspace may define additional project‑specific patterns. Launch configurations can then add temporary overrides without modifying shared files.

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
