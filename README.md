# Tracciatto

Tracciatto is a Ruby debugger extension built on top of the `rdbg` debugger from the [`debug` gem](https://github.com/ruby/debug). The extension was created to explore debugger integration and new features using `rdbg`'s feature set as its primary guide.

Some of the unique features: 
- Native support for **multi‑root workspaces**.
- Ability to attach to **multiple sockets/ports** simultaneously.
- An [**Exception Filters**](#exception-filters) view that provides a UI-centric interface for managing `catch` breakpoints.
- Flexible **skip‑path** configuration (launch configuration, user settings, and workspace file), allowing you to filter out unwanted code from stack traces with maximum flexibility.

This is **not a fork** of the [VS Code Ruby rdbg Debugger](https://github.com/ruby/vscode-rdbg) extension. That extension has been invaluable in day‑to‑day work and greatly appreciated. While its implementation has been referenced, Tracciatto follows a different design philosophy. This is evident when looking at the code, and it has made several features available from the start or simply easier to implement.

Attach‑based debugging is the most refined because it is the mode exercised daily. Other debugging paths evolve more slowly simply because they are not part of my regular workflow. Feedback here is always welcome.

<p align=center>
<img width="600" alt="VS Code in Debug mode, with new Exception Filters window visible" src="https://github.com/user-attachments/assets/916957a6-9a11-43a4-a2b9-6479b7b572d4" />
</p>

## Table of Contents
- [Getting Started](#getting-started)
  - [Launching a debug session](#launching-a-debug-session)
  - [Attaching to a running process](#attaching-to-a-running-process)
- [Configuration](#configuration)
- [Debug Configurations](#debug-configurations)
  - [`tracciatto`](#tracciatto-1)
  - [`rdbg` (vscode‑rdbg)](#rdbg-vscoderdbg)
- [Commands](#commands)
- [Breakpoints](#breakpoints)
  - [Exception Filters](#exception-filters)
- [Skip-Path Patterns](#skip-path-patterns)
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

## Configuration

Tracciatto supports the following user and workspace settings:

| Setting | Description | Default |
|---------|-------------|---------|
| `tracciatto.debug.preferBundler` | Prefer running under `bundle exec` to run `tracciatto.debug.runtimeExecutable` when a `Gemfile` is present and no `runtimeExecutable` is explicitly set in the configuration. | `true` |
| `tracciatto.debug.runtimeExecutable` | Path to the Ruby executable used for debugging. | `ruby` |
| `tracciatto.debug.skipPaths` | Additional skip‑path patterns applied when stepping in the Ruby debugger. Merged with launch configuration and project file patterns. | None |
| `tracciatto.debug.skipPathsFileName` | Filename containing skip‑path patterns. May be absolute, or relative to the workspace root. | `.tracciatto-skip-paths` |
| `tracciatto.logDapMessages` | Log all Debug Adapter Protocol messages as [trace entries](#logs). Normally useful only for extension or DAP debugging. This setting can be toggled at any time during a debugging session, making it more flexible than the `rdbg` configuration option `showProtocolLog`. | `false` |

### Experiments

The following settings are patches to DAP requests and therefore considered experimental/unstable. They are disabled by default and they are not exposed from the Settings UI.

| Setting | Description |
|---------|-------------|
| `tracciatto.patchNilVariableExpansion` | Patch `nil` variables so they do not appear as expandable in the **Variables** and **Watches** views. This setting can be toggled at any point during a debug session, but will apply on next step. |
| `tracciatto.patchSetVariable` | Emulate `setVariable` DAP message support so variable values can be edited from the **Variables** and **Watches** views. This capability is reported during DAP initialization, so changes take effect only after restarting the debug session. |

[↑ Back to top](#table-of-contents)

## Debug Configurations

### tracciatto

This extension provides its own debug type: `tracciatto`. It supports both **launch** and **attach** modes with the following properties:

#### Launch Properties

| Property | Description |
|----------|-------------|
| `program` | Ruby file to debug (**required**) |
| `args` | Arguments passed to the Ruby program |
| `cwd` | Working directory |
| `env` | Environment variables passed to the Ruby program |
| `runtimeExecutable` | Ruby command to run (`ruby` by default) |
| `rdbgPath` | Optional absolute path to rdbg |
| `skipPaths` | Paths to skip when stepping |

#### Attach Properties

| Property | Description |
|----------|-------------|
| `port` | `[host:]port` path to the rdbg DAP server |
| `socket` | Socket path to the rdbg DAP server |
| `socketTimeoutMs` | Timeout in milliseconds for the rdbg socket to appear before failing. Set to `0` to fail immediately |
| `rdbgPath` | Optional absolute path to rdbg |
| `skipPaths` | Paths to skip when stepping |

### rdbg (vscode‑rdbg)

This extension is compatible with the `rdbg` debug type provided by the **vscode‑rdbg** extension. It supports both **launch** and **attach** modes, but it only accepts a subset of properties.

> To prevent a conflict, this support is **automatically disabled** whenever the `vscode‑rdbg` extension is installed and active. 

This happens during extension activation, so reloading the extension is needed after disabling or (un)installing **vscode‑rdbg**. Check the [logs](#logs) for confirmation. Note that the `tracciatto` debug type is always available.

#### Launch Properties

| Property | Description |
|----------|-------------|
| `args` | Arguments passed to the Ruby program |
| `command` | Command name (`ruby`, `rake`, `bin/rails`, `bundle exec ruby`, etc) |
| `cwd` | Working directory |
| `env` | Environment variables passed to the Ruby program |
| `rdbgPath` | Absolute path to `rdbg` |
| `script` | Absolute path to a Ruby file (**required**) |
| `showProtocolLog` | Log DAP communication messages. Prefer `tracciatto.logDapMessages` [setting](#configuration) |
| `useBundler` | Use `bundle exec` to run Ruby program. Prefer `tracciatto.preferBundler` [setting](#configuration) |

#### Attach Properties

| Property | Description |
|----------|-------------|
| `debugPort` | `[hostname:]port` or socket path to the rdbg DAP server |
| `rdbgPath` | Optional absolute path to rdbg |
| `showProtocolLog` | Log DAP communication messages. Prefer `tracciatto.logDapMessages` [setting](#configuration) |

## Commands

The following commands are intended for quick verification of standalone scripts, not as a replacement for a workspace [launch configuration](https://code.visualstudio.com/docs/debugtest/debugging-configuration#_launch-configurations). Code is run using the `tracciatto.runtimeExecutable` setting value (defaults to `ruby`).

| Command | Description |
|---------|-------------|
| **Attach to…** | Attach to `host:port` or socket |
| **Debug Active Editor** | Debugs the active Ruby editor |
| **Run Active Editor** | Executes the active Ruby file |

[↑ Back to top](#table-of-contents)

## Breakpoints

The following breakpoint types are supported from UI:

- **Line Breakpoint**: stops at a specific file/line.  
  - Set by clicking the editor gutter or pressing **F9**.  
  - **Debug console**: `break <file>:<line>`

- **Conditional Line Breakpoint**: stops only if an expression evaluates truthy.  
  - Set by right‑clicking a line breakpoint → **Edit Breakpoint…**.  
  - **Debug console**: `break <file>:<line> if <expr>`

- **Catch Breakpoint**: stops when a specific exception class is raised.  
  - rdbgs native integration only exposes **rescue any exception** and **rescue RuntimeError** in the VS Code **Breakpoints** view.  
  - Tracciatto expands this via the [Exception Filters](#exception-filters) view.  
  - **Debug console**: `catch <ExceptionClass>`

The following breakpoint types depend on **runtime entities** (methods, objects, or expressions). 

> These breakpoints **cannot be preset** in the general case because the target entities do not exist until the Ruby VM loads the relevant code. They can only reliably be defined **during an active debug session**.

VS Code allows adding some of these using the **Add Function Breakpoint** command, but rdbg will silently fail to set them up during session startup unless the method/object already exists (e.g., when attaching to a long‑running process).

- **Method Breakpoint**: stops when a method is called.  
  - Supported in VS Code as function breakpoints.  
  - **Debug console**: `break <Class>.<method>` or `break <Class>#<method>`

- **Object Breakpoint**: stops when a specific object is used as receiver/argument.  
  - No VS Code UI entrypoint.  
  - **Debug console**: `watch object <expr>`

- **Watch Breakpoint**: stops when the value of an expression changes.  
  - No VS Code UI entrypoint.
  - **Debug console**: `watch <expr>`

- **Temporary Breakpoint**: stops once, then removes itself.  
  - No VS Code UI entrypoint.  
  - **Debug console**: `break <file>:<line> once`

- **Tracepoint (line/call/exception/object)**: logs events without stopping.  
  No VS Code UI entrypoint.  
  **Debug console**: `trace <event>` (e.g., `trace call`, `trace line`)

### Exception Filters

The **Exception Filters** view lets you easily select  Ruby exceptions should have rdbg to break at. There are two categories:

* **Built‑in Filters**: represent common Ruby exception classes. These filters are always available and **cannot be edited or removed**.
* **User Filters**: you can add any Ruby exception class (e.g., `NoMethodError`, `KeyError`, `ActiveRecord::RecordNotFound`) and control whether the debugger should break when it is raised.

Exception filters can be toggled at any point in time, be that before or during program debugging.

[↑ Back to top](#table-of-contents)

## Skip-Path Patterns

Rdbg supports *skip‑paths* glob patterns that tell the debugger which files it should not step into. This affects not only step-by-step debugging but also specific frames the debugger shows as part of the current call stack. For complex projects, this is invaluable as there might be significant portions of the stack you do not care about at a given point in time, e.g. gem code.

Tracciatto aligns with this model by allowing skip‑paths to come from multiple sources. Patterns are merged and passed to `rdbg` via the `RUBY_DEBUG_SKIP_PATH` environment variable. There are three possible sources for skip‑paths:

### **1. Launch configuration**

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

### **2. Workspace file**

A workspace‑level file containing one pattern per line, with lines beginning with `#` being ignored. The filename is controlled by `tracciatto.debug.skipPathsFileName` (default: `.tracciatto-skip-paths`).

#### Skip‑path pattern format

Skip‑paths use the same glob‑style matching rules as `rdbg`. These are evaluated against **absolute** file paths.

Supported constructs:
- `*`: match within a single path segment
- `**`: match across directory boundaries
- `?`: match a single character
- `[abc]`: character classes

Comments can be added by startiing a line with `#` (Ruby comment). Blank lines are allowed.

**Examples**
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

### **3. Setting**

The `tracciatto.debug.skipPaths` setting provides an additional place to define skip‑paths, useful for global or personal preferences.

### Choosing where to define skip‑paths

Use this table to decide which source fits your workflow:

| Source | Scope | Best for | Notes |
|--------|-------|----------|-------|
| **Launch configuration** | Per debug session | Scenario‑specific exclusions | Lives in `launch.json` |
| **Workspace file** | Per project | Shared team rules or stable project‑level patterns | Version‑controlled; one pattern per line; **preferred** |
| **Setting** | Global or workspace | Personal preferences across all projects | Great for "always skip Rails internals" |

This layered approach provides maximum flexibility: global preferences, project‑level rules, and session‑specific overrides can all coexist cleanly.

### Why multiple sources?

Different users and teams have different needs. You may always want to skip stepping into Rails internals across all projects, while each workspace may define additional project‑specific patterns. Launch configurations can then add temporary overrides without modifying shared files.

[↑ Back to top](#table-of-contents)

## Logs

Tracciatto writes diagnostic information to the **Tracciatto** output channel.
You can adjust the log level using **Developer: Set Log Level** and selecting **Tracciatto**.
See the [documentation](https://code.visualstudio.com/updates/v1_73#_setting-log-level-per-output-channel) for details.

[↑ Back to top](#table-of-contents)
