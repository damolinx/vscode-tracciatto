# Tracciatto

Tracciatto is a Ruby debugging extension built on top of the **rdbg** debugger from the [**debug**](https://github.com/ruby/debug) library. It provides its own [`tracciatto`](#tracciatto-1) debug type and supports the [`rdbg`](#rdbg-vscoderdbg) debug type as well. The extension explores debugger integration, guided by **rdbg**’s capabilities and informed by backlogs from other extensions to better understand common user needs.

Some of the unique features offered by this extension:

- Support for **multi‑root workspaces**
- Ability to attach to **multiple sockets/ports** simultaneously
- An [**Exception Filters**](#exception-filters) view for managing `catch` breakpoints via UI
- Flexible [**skip-path**](#skip-path-patterns) management via launch configuration, user settings, and a workspace file.

Additionally, the extension patches **debug** library behaviors through [configuration](#debug-protocol-overrides), including:
- Allowing the maximum inspected‑string length to be changed from 180 characters ([ref](https://github.com/ruby/debug/blob/95997c297acd7adc20be81b52d2d1405805671d2/lib/debug/server_dap.rb#L779))
- Enabling **Set Value**  action on fields in the **Watch** and **Variables** views ([ref](https://github.com/ruby/debug/blob/95997c297acd7adc20be81b52d2d1405805671d2/lib/debug/server_dap.rb#L172))

This is **not a fork** of the [VS Code Ruby rdbg Debugger](https://github.com/ruby/vscode-rdbg) extension. That extension has been incredibly valuable in my daily work and is greatly appreciated. While its implementation has been referenced, Tracciatto follows a distinct design philosophy. This is evident in the code, and several requested features have naturally emerged due to this design or have been straightforward to implement.

Development tends to favor the attach‑based debugging scenario because it is the one I use daily. Feedback on other scenarios is always welcome.

<p align=center>
<img width="600" alt="VS Code in Debug mode, with new Exception Filters window visible" src="https://github.com/user-attachments/assets/916957a6-9a11-43a4-a2b9-6479b7b572d4" />
</p>

## Table of Contents
- [Getting Started](#getting-started)
  - [Launching a debug session](#launching-a-debug-session)
  - [Attaching to a running process](#attaching-to-a-running-process)
- [Configuration](#configuration)
  - [Debug Protocol Overrides](#debug-protocol-overrides)
  - [Version Managers](#version-managers)
- [Debug Configurations](#debug-configurations)
  - [`tracciatto`](#tracciatto-1)
  - [`rdbg` (vscode‑rdbg)](#rdbg-vscoderdbg)
- [Commands](#commands)
- [Breakpoints](#breakpoints)
  - [Exception Filters](#exception-filters)
- [Skip-Path Patterns](#skip-path-patterns)
- [Logs](#logs)

## Getting Started

Tracciatto uses **rdbg** to support the two main debugging workflows:

- **Launch**: VS Code starts a Ruby script under the debugger.
- **Attach**: VS Code connects to an already running Ruby process started with `rdbg`.

### Launching a debug session

#### Option 1: Launch configuration

1. Add a `launch` configuration to `.vscode/launch.json`

    ```jsonc
    {
      "type": "tracciatto",
      "request": "launch",
      "name": "Debug current file",
      // ${file} is convenient for initial testing, but it resolves to whatever
      // editor is active. VS Code does not restrict this to Ruby files, so you
      // may end up trying to debug a text file or even an Output channel.
      // Prefer a deterministic path like `${workspaceFolder}/my_script.rb`.
      "program": "${file}"
    }
    ```

2. [Start](https://code.visualstudio.com/docs/debugtest/debugging-configuration#_start-a-debugging-session-with-a-launch-configuration) your debugging session session using the launch configuration. 

#### Option 2: Debug command

1. Run the **Tracciatto: Debug Active Editor** command

This command uses an internal debug configuration, so `.vscode/launch.json` is not needed or updated in any way.

### Attaching to a running process

To attach to a running Ruby process, you must have started it with `rdbg` in attach mode. Refer to the debug library [documentation](https://github.com/ruby/debug#invoke-as-a-remote-debuggee) for details.

**Example: Start a script with the debugger open on a given port**
```sh
rdbg --open --port 12345 -- your_script.rb
```

**Example: Start a script with the debugger open on a given socket**
```sh
rdbg --open --sock-path /tmp/rdbg.sock -- your_script.rb
```

Alternatively, you can modify your code to launch the debugger explicitly when needed. Refer to the debug library [documentation](https://github.com/ruby/debug#debugger-api) for details.

**Example: Start the debugger programmatically**
```ruby
  require 'debug/open'
```

In all cases, the **debug** library will print a `DEBUGGER: Debugger can attach via ...` message which includes the socket or port number to attach to.

Once the port or socket are setup, you can use one of the following options to attach to it.

#### Option 1: Launch configuration

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

2. [Start](https://code.visualstudio.com/docs/debugtest/debugging-configuration#_start-a-debugging-session-with-a-launch-configuration) your debugging session session using the launch configuration. 

#### Option 2: Attach-to command

1. Run the **Tracciatto: Attach To…** command

2. Provide the socket path or the port number to attach to.


[↑ Back to top](#table-of-contents)

## Configuration

Tracciatto supports the following user and workspace settings:

| Setting | Description | Default |
|---------|-------------|---------|
| `tracciatto.debug.preferBundler` | Prefer running under `bundle exec` to run `tracciatto.debug.runtimeExecutable` when a `Gemfile` is present and no `runtimeExecutable` is explicitly set in the configuration. | `true` |
| `tracciatto.debug.runtimeExecutable` | Path to the Ruby executable used for debugging. | `ruby` |
| `tracciatto.debug.skipPaths` | Additional skip‑path patterns applied when stepping in the Ruby debugger. Merged with launch configuration and project file patterns. | None |
| `tracciatto.debug.skipPathsFileName` | Filename containing skip‑path patterns. May be absolute, or relative to the workspace root. | `.tracciatto-skip-paths` |
| `tracciatto.forceEnableRdbgDebugType` | Force-enable built‑in `rdbg` debug type even when the `vscode‑rdbg` extension is installed but detected as inactive. Requires window reload after changing. | `false` |
| `tracciatto.logDapMessages` | Log all Debug Adapter Protocol messages as [trace entries](#logs). Normally useful only for extension or DAP debugging. This setting can be toggled at any time during a debugging session, making it more flexible than the `rdbg` configuration option `showProtocolLog`. | `false` |

### Debug Protocol Overrides

The following settings customize debugger behavior by modifying specific Debug Adapter Protocol messages. They affect UI surfaces that render debugger results like the **Variables** and **Watches** views, or the **Debug** console itself.

| Setting | Description | Default |
|---------|-------------|---------|
| `tracciatto.patchMaxInspectedValueLength` | Changes the maximum length of text returned from the debugger for inspected values. `rdbg` [sets](https://github.com/ruby/debug/blob/95997c297acd7adc20be81b52d2d1405805671d2/lib/debug/server_dap.rb#L776) this to be 180. Changes to this setting apply on the next step or evaluation. | 180 |
| `tracciatto.patchSimpleTypeExpansion` | Prevents simple types from appearing as expandable in debugger views like **Watches**. Changes to this setting apply on the next step or evaluation. | `true` |
| `tracciatto.patchSetVariable` | Emulates `setVariable` support so variable values can be edited from debugger views using the **Set Value** action. Changes to this setting apply on the next debug session. | `false` |

These changes are protocol‑compliant, but they modify low‑level DAP behavior so they can be disabled if they cause any issues. 

**Notes**
* `tracciatto.patchSimpleTypeExpansion`: Simple types: `Complex`, `BigDecimal`, `FalseClass`, `Float`, `Integer`, `NilClass`, `Rational`, `Regexp`, `String`, `Symbol`, `Time`, `TrueClass`
* `tracciatto.patchSetVariable`: **Set Value** is particularly sensitive to context and variable types, and some scenarios might not be ever possible from the extension side (i.e. `rdbg` is the only reasonable source). You should see a **Failed** error when a given scenario is not possible.

[↑ Back to top](#table-of-contents)

### Version Managers

| Setting | Description | Default |
|--------|-------------|---------|
| `tracciatto.rubyEnvironmentManager` | Select a version manager: `none`, `asdf`, `rbenv`, `rvm`, or use `custom` to provide your own command via `tracciatto.customRubyEnvironmentCommand`. See [Managers](#managers) for details. | `none` |
| `tracciatto.customRubyEnvironmentCommand` | A command-line used to retrieve the Ruby environment. See [Custom Managers](#custom-managers) for details. | |
| `tracciatto.customRubyEnvironmentCommandOutputFormat` | Specifies the output format of the command defined by the `tracciatto.customRubyEnvironmentCommand` setting. | `json`|

#### Managers

Managers are used to discover the base environment used to **launch** a debug program. Any environment values defined in your debug configuration are applied on top of it.  
The environment is isolated per workspace folder and per debug session, making it **compatible** with **multi-root workspaces**.

The environment is calculated once and cached, with invalidation rules. If the environment seems incorrect, reload the current window.

The following managers are supported:

- `none`: Tracciatto does not use any version manager. Ruby is launched exactly as configured in your debug configuration or as found on your system PATH.
- `asdf`: Use `asdf` to resolve the Ruby version and environment.
- `rbenv`: Use `rbenv` to resolve the Ruby version and environment.
- `rvm`: Use RVM to resolve the Ruby version and environment.
- `custom`: See [Custom Managers](#custom-managers).

##### Custom Managers

The `custom` manager-type gives you **full control** over how Ruby is resolved.  
It also allows supporting any future or niche manager without waiting for an extension update.

Once enabled, you must provide a command-line for the `tracciatto.customRubyEnvironmentCommand` setting.

This command must print the Ruby environment as either:

  - JSON (`JSON.dump(ENV.to_h)`), e.g. `rbenv exec ruby -- -rjson -e 'print JSON.dump(ENV.to_h)'`

or
  - one `KEY=VALUE` pair per line, e.g. `rbenv exec ruby -e 'ENV.each { |k,v| puts "#{k}=#{v}" }'`

Use the `tracciatto.customRubyEnvironmentCommandOutputFormat` setting to specify the format the command outputs.

The following table shows examples of how to configure common tools using `custom` (generated using Copilot; results may vary):

| Manager | Example | Notes |
|---------|---------|-------|
| chruby | `chruby-exec ruby -- ruby -rjson -e 'print JSON.dump(ENV.to_h)'` | Requires `chruby-exec` |
| devbox | `devbox run -- ruby -rjson -e 'print JSON.dump(ENV.to_h)'` | Uses devbox's environment |
| direnv | `direnv exec . ruby -rjson -e 'print JSON.dump(ENV.to_h)'` | Runs Ruby inside the direnv-managed environment |
| Docker | `docker compose exec app ruby -rjson -e 'print JSON.dump(ENV.to_h)'` | For containerized Ruby apps |
| mise | `mise exec ruby -- -rjson -e 'print JSON.dump(ENV.to_h)'` | Uses mise's environment |
| nix-shell | `nix-shell --run "ruby -rjson -e 'print JSON.dump(ENV.to_h)'"` | Uses the project's nix shell |
| WSL | `wsl ruby -rjson -e 'print JSON.dump(ENV.to_h)'` | Uses Ruby inside WSL |

[↑ Back to top](#table-of-contents)

## Debug Configurations

### tracciatto

This extension provides its own debug type: `tracciatto`. It supports both **launch** and **attach** modes with the following properties:

#### Launch Properties

| Property | Description |
|----------|-------------|
| `args` | Arguments passed to the Ruby program. |
| `cwd` | Working directory. |
| `env` | Environment variables passed to the Ruby program. |
| `localFs` |	Passthrough option forwarded directly to rdbg for local filesystem access configuration. |
| `localFsMap` | Passthrough option forwarded directly to rdbg for mapping local filesystem paths. This is a comma-separated list of `remote_dir:local_dir` mappings, e.g. `/remote/folder1:/local/folderA,/remote/folder2:/local/folderB`. |
| `program` | Ruby file to debug (**required**). |
| `runtimeExecutable` | Ruby command to run (`ruby` by default). |
| `rdbgPath` | Optional absolute path to rdbg. |
| `skipPaths` | Paths to skip when stepping. |

#### Attach Properties

| Property | Description |
|----------|-------------|
| `localFs` |	Passthrough option forwarded directly to rdbg for local filesystem access configuration. |
| `localFsMap` | Passthrough option forwarded directly to rdbg for mapping local filesystem paths. This is a comma-separated list of `remote_dir:local_dir` mappings. e.g. `/remote/folder1:/local/folderA,/remote/folder2:/local/folderB`. |
| `port` | `[host:]port` path to the rdbg DAP server. |
| `socket` | Socket path to the rdbg DAP server. |
| `socketTimeoutMs` | Timeout in milliseconds for the rdbg socket to appear before failing. Set to `0` to fail immediately. |
| `rdbgPath` | Optional absolute path to rdbg. |
| `skipPaths` | Paths to skip when stepping. |

### rdbg (vscode‑rdbg)

This extension supports the `rdbg` debug type, normally provided by the **vscode‑rdbg** extension, although only a subset of configuration properties is used; unsupported properties are ignored.

> By default, Tracciatto's built‑in `rdbg` support is **automatically disabled** whenever the `vscode‑rdbg` extension is installed. This avoids conflicts where both extensions attempt to contribute the same debug type.

If needed, the setting `tracciatto.forceEnableRdbgDebugType` allows forcing registering Tracciatto's built‑in `rdbg` support even when `vscode‑rdbg` is installed, as long as it is detected as inactive. Note that VS Code does not provide a reliable way to track whether another extension is active (e.g. there is no activation event), so enabling this setting may cause both extensions to attempt registering the debug type. In that case, whichever extension registers second will fail with an error. This option exists so users experimenting with Tracciatto do not need to uninstall `vscode‑rdbg` and can simply disable it instead.

Debug‑type detection happens during extension activation, so you must reload the window after installing, uninstalling, enabling, or disabling **vscode‑rdbg**. Check the [logs](#logs) to confirm which debugger is active.

#### Launch Properties

| Property | Description |
|----------|-------------|
| `args` | Arguments passed to the Ruby program. |
| `command` | Command name (`ruby`, `rake`, `bin/rails`, `bundle exec ruby`, etc). |
| `cwd` | Working directory. |
| `env` | Environment variables passed to the Ruby program. |
| `localFs` |	Passthrough option forwarded directly to rdbg for local filesystem access configuration. |
| `localFsMap` | Passthrough option forwarded directly to rdbg for mapping local filesystem paths. This is a comma-separated list of `remote_dir:local_dir` mappings. e.g. `/remote/folder1:/local/folderA,/remote/folder2:/local/folderB`. |
| `rdbgPath` | Absolute path to `rdbg`. |
| `script` | Absolute path to a Ruby file (**required**). |
| `showProtocolLog` | Log DAP communication messages. Prefer `tracciatto.logDapMessages` [setting](#configuration). |
| `useBundler` | Use `bundle exec` to run Ruby program. Prefer `tracciatto.preferBundler` [setting](#configuration). |

#### Attach Properties

| Property | Description |
|----------|-------------|
| `debugPort` | `[hostname:]port` or socket path to the rdbg DAP server. |
| `localFs` |	Passthrough option forwarded directly to rdbg for local filesystem access configuration. |
| `localFsMap` | Passthrough option forwarded directly to rdbg for mapping local filesystem paths. This is a comma-separated list of `remote_dir:local_dir` mappings. e.g. `/remote/folder1:/local/folderA,/remote/folder2:/local/folderB`. |
| `rdbgPath` | Optional absolute path to rdbg. |
| `showProtocolLog` | Log DAP communication messages. Prefer `tracciatto.logDapMessages` [setting](#configuration). |

## Commands

The following commands are intended for quick verification of standalone scripts, not as a replacement for a workspace [launch configuration](https://code.visualstudio.com/docs/debugtest/debugging-configuration#_launch-configurations). Code is run using the `tracciatto.runtimeExecutable` setting value (defaults to `ruby`).

| Command | Description |
|---------|-------------|
| **Attach to…** | Attach to `host:port` or socket. When exactly **one workspace folder** is open, it is used as one source for [skip-paths](#skip-path-patterns). In multi‑root workspaces no folder is selected. The `tracciatto.debug.skipPathsFileName` setting is always used as it comes from user settings. |
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
  - rdbg's native integration only exposes **rescue any exception** and **rescue RuntimeError** in the VS Code **Breakpoints** view.
  - Tracciatto expands this via the [Exception Filters](#exception-filters) view.
  - **Debug console**: `catch <ExceptionClass>`

The following breakpoint types depend on **runtime entities** (methods, objects, or expressions). 

> These breakpoints **cannot be preset** in the general case because the target entities do not exist until the Ruby VM loads the relevant code. They can only reliably be defined **during an active debug session**.

VS Code allows adding some of these using the **Add Function Breakpoint** command, but rdbg will silently fail to set them up at session startup unless the method/object already exists (e.g., when attaching to a long‑running process).

- **Method Breakpoint**: stops when a method is called.
  - Supported in VS Code as function breakpoints.
  - **Debug console**: `break <Class>.<method>` or `break <Class>#<method>`

- **Object Breakpoint**: stops when a specific object is used as receiver/argument.
  - No VS Code UI entry point.
  - **Debug console**: `watch object <expr>`

- **Watch Breakpoint**: stops when the value of an expression changes.
  - No VS Code UI entry point.
  - **Debug console**: `watch <expr>`

- **Temporary Breakpoint**: stops once, then removes itself.
  - No VS Code UI entry point.
  - **Debug console**: `break <file>:<line> once`

- **Tracepoint (line/call/exception/object)**: logs events without stopping.
  - No VS Code UI entry point.
  - **Debug console**: `trace <event>` (e.g., `trace call`, `trace line`)

### Exception Filters

The **Exception Filters** view provides a convenient way to manage Ruby exceptions that should trigger a breakpoint in rdbg. It is similar to its `catch` command, but provides significant advantages as these are applied automatically at the start of any type of debugging session, they can be easily toggled at any point, and you can maintain a custom list of exceptions specific to your project.
Exceptions are categorized into two distinct groups:

* **Built‑in Filters**: common Ruby exception classes offered by default; they are disabled by default and they **cannot be edited or removed**.
* **User Filters**: custom list of Ruby exception classes (e.g., `NoMethodError`, `KeyError`, `ActiveRecord::RecordNotFound`) you define for the current workspace.

Exception filters can be toggled at any point in time, with the extension either applying in the next debug session start/launch or applying to the currently running ones.

[↑ Back to top](#table-of-contents)

## Skip-Path Patterns

Rdbg supports *skip‑paths* glob patterns that tell the debugger which files it should not step into. This affects not only step-by-step debugging but also specific frames the debugger shows as part of the current call stack. For complex projects, this is invaluable as there might be significant portions of the stack you do not care about at a given point in time, e.g. gem code. 

Tracciatto aligns with this model by allowing skip‑paths to come from multiple sources. Patterns are merged and passed to `rdbg` via the `RUBY_DEBUG_SKIP_PATH` environment variable. 

Different users and teams have different needs. You may always want to skip stepping into Rails internals across all projects, while each workspace may define additional project‑specific patterns. Launch configurations can then add temporary overrides without modifying shared files, this is why there are three possible sources for skip‑paths:

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

Comments can be added by starting a line with `#` (Ruby comment). Blank lines are allowed.

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

### **Token Replacement**

Tracciatto supports the `${workspaceFolder}` token as **prefix** on skip-paths. For example, `${workspaceFolder}/lib` becomes `/Users/user/project/lib`, while `${workspaceFolder}lib` becomes `/Users/user/projectlib`.

[↑ Back to top](#table-of-contents)

## Logs

Tracciatto writes diagnostic information to the **Tracciatto** output channel.
You can adjust the log level using **Developer: Set Log Level** and selecting **Tracciatto**.
See the [documentation](https://code.visualstudio.com/updates/v1_73#_setting-log-level-per-output-channel) for details.

[↑ Back to top](#table-of-contents)
