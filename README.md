# Tracciatto

Tracciatto is a Ruby debugger extension built on top of the `rdbg` debug adapter.

<p align=center>
<img width="600" alt="VS Code in Debug mode, with new Exception Filters window visible" src="https://github.com/user-attachments/assets/916957a6-9a11-43a4-a2b9-6479b7b572d4" />
</p>

## Table of Contents
- [Getting Started](#getting-started)
  - [Launching a debug session](#launching-a-debug-session)
  - [Attaching to a running process](#attaching-to-a-running-process)
  - [Compatibility with `rdbg` (vscode‑rdbg)](#compatibility-with-rdbg-vscoderdbg)
- [Configuration](#configuration)
  - [Skip frames](#skip-frames)
- [Commands](#commands)
- [Exception Filters](#exception-filters)
- [Logs](#logs)

## Getting Started

Tracciatto integrates with `rdbg` to support the two main debugging workflows:

- **Launch**: VS Code starts Ruby under the debugger
- **Attach**: VS Code connects to an already running Ruby process started with `rdbg`

Press F5 on any `.rb` file to automatically create debug configurations in `.vscode/launch.json`.

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

2. Add an `attach` configuration to `.vscode/launch.json`:

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

3. Run the **Attach to Ruby** debug configuration.

[↑ Back to top](#table-of-contents)

#### Compatibility with rdbg (vscode‑rdbg)
This extension is compatible with the `rdbg` debug type provided by the
**vscode‑rdbg** extension. It supports both **launch** and **attach** modes, but it only accepts a subset of properties:
- `args`, `command`, `cwd`, `env`
- `debugPort`: attach port (`[hostname:]port`) or socket path
- `rdbgPath`: optional override for the `rdbg` executable
- `script`: required for launch
- `showProtocolLog`: log DAP communication messages, Prefer `tracciatto.logDapMessages` [setting](#configuration)
- `userBundler`: force using `bundle exec ruby` to run Ruby program. Prefer `tracciatto.preferBundler` [setting](#configuration)

To avoid conflicts, this support is **automatically disabled** whenever the `vscode‑rdbg` extension is installed and active. This is set during extension activation, so reloading the extension would be needed after disabling or uninstalling **vscode‑rdbg** if it was present. Check [logs](#loga) for confirmation. Note that the `tracciatto` debug type is always available.

[↑ Back to top](#table-of-contents)

## Configuration

Tracciatto supports the following user and workspace settings:

## Configuration

Tracciatto supports the following user and workspace settings:

| Setting | Description | Default |
|---------|-------------|---------|
| `tracciatto.debug.preferBundler` | Prefer running under `bundle exec` to run `tracciatto.debug.runtimeExecutable` when a `Gemfile` is present and no `runtimeExecutable` is explicitly set in the configuration. | `true` |
| `tracciatto.debug.runtimeExecutable` | Path to the Ruby executable used for debugging. | `ruby` |
| `tracciatto.debug.skipPaths` | Additional skip‑path patterns applied when stepping in the Ruby debugger. Merged with launch configuration and project file patterns. | None |
| `tracciatto.debug.skipPathsFileName` | Filename containing skip‑path patterns. May be absolute, or relative to the workspace root. | `.tracciatto-skip-paths` |
| `tracciatto.logDapMessages` | Log all Debug Adapter Protocol messages as [trace entries](#logs). Normally useful only for extension or DAP debugging. This setting can be toggled at any time during a debugging session, making it more flexible than the `rdbg` configuration option `showProtocolLog`. | `false` |

[↑ Back to top](#table-of-contents)

### Skip frames

Rdbg supports *skip‑paths* glob patterns that tell the debugger which files it should not step into. This affects not only step-by-step debugging but also specific frames the debugger shows as part of the current call stack. For complex projects, this is invaluable as there might be significant portions of the stack you do not care about at a given point in time, e.g. gem code.

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

Comments can be added by startiing a line with `#` (Ruby comment). Blank lines are allowed.

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
|--------|-------|----------|-------|
| **Launch configuration** | Per debug session | Scenario‑specific exclusions | Lives in `launch.json` |
| **Workspace file** | Per project | Shared team rules or stable project‑level patterns | Version‑controlled; one pattern per line; **preferred** |
| **Setting** | Global or workspace | Personal preferences across all projects | Great for "always skip Rails internals" |

This layered approach provides maximum flexibility: global preferences, project‑level rules, and session‑specific overrides can all coexist cleanly.

#### Why multiple sources?

Different users and teams have different needs. You may always want to skip stepping into Rails internals across all projects, while each workspace may define additional project‑specific patterns. Launch configurations can then add temporary overrides without modifying shared files.

[↑ Back to top](#table-of-contents)

## Commands

The following commands are intended for quick verification of standalone scripts, not as a replacement for a workspace [launch configuration](https://code.visualstudio.com/docs/debugtest/debugging-configuration#_launch-configurations). Code is run using the `tracciatto.runtimeExecutable` setting value (defaults to `ruby`).

| Command                          | Description |
|----------------------------------|-------------|
| **Attach to…** | Attach to  host:port or socket |
| **Debug Active Editor** | Debugs the active Ruby editor |
| **Run Active Editor** | Executes the active Ruby file |

[↑ Back to top](#table-of-contents)

## Exception Filters

The **Exception Filters** view lets you easily select  Ruby exceptions should have `rdbg` to break at. There are two categories:

* **Built‑in Filters**: represent common Ruby exception classes. These filters are always available and **cannot be edited or removed**.
* **User Filters**: you can add any Ruby exception class (e.g., `NoMethodError`, `KeyError`, `ActiveRecord::RecordNotFound`) and control whether the debugger should break when it is raised.

Exception filters can be toggled at any point in time, be that before or during program debugging.

[↑ Back to top](#table-of-contents)

## Logs

Tracciatto writes diagnostic information to the **Tracciatto** output channel.
You can adjust the log level using **Developer: Set Log Level** and selecting **Tracciatto**.
See the [documentation](https://code.visualstudio.com/updates/v1_73#_setting-log-level-per-output-channel) for details.

[↑ Back to top](#table-of-contents)
