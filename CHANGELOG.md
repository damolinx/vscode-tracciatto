# Changelog

## 0.2.10
- **Attach to…**:
  - Improve socket path validation.
  - MRU value saved across sessions.
- Improve **Set Value** error messages so they provide more detail than just "Failed".
- Add **Edit Exception Filter** action to **Exception Filters**.
- Disable `supportsStepBack` capability.
- Fix: `bundle exec` not used in all expected cases.
  - As a side effect, a `LoadError` from a bad `require` would cause the debugger to terminate silently.

## 0.2.9
- Enable DAP customizations by default and add them to the Settings UI.
  - Improve **Set Value** behavior in several scenarios.
- Rename `tracciatto.patchNilVariableExpansion` to `tracciatto.patchSimpleTypeExpansion` to accomodate for more types (check the README).
- Fix: `rdbg` debug-type support can only be enabled if **vscode-rdbg** is not installed.
- Fix: Blank icon for **Exception Filters**.

## 0.2.8
- Skip-paths support `${workspaceFolder}` token replacement.
- DAP-message log entries use a short version of the associated debug session id for readability. 

## 0.2.7
- **Attach to…**:
  - Port number must be 1024 or higher to avoid privileged ports.
  - Workspace folder is used as source for skip-paths in single-root workspaces.

## 0.2.6
- Add schema entries for `localFs` and `localFsMap` in all configurations since these are passthrough to `rdbg`.
- Add an error message when the skip-paths file defined by `tracciatto.debug.skipPathsFileName` is missing and is not using the default file name.
- **Attach to…** command's input control validates socket paths for better UX.
- Patch to DAP behavior (disabled by default):
  - Change the default maximum length of inspected values (defaults to 180). Setting: `tracciatto.patchMaxInspectedValueLength`. 
- Fix: `RUBY_DEBUG_SKIP_PATH` initial value is overriden on debugger launch/attach.

## 0.2.5
- `setVariable` now works on any frame (not just top one).

## 0.2.4
- Patch to DAP behavior (disabled by default):
  - `nil` variables do not appear as expandable in the **Variables** and **Watches** views. Setting: `tracciatto.patchNilVariableExpansion`.
  - Emulate `setVariable` message support. Setting: `tracciatto.patchSetVariable`.

## 0.2.3
- Input boxes remember recent values (current session only).
- Default `cwd` to `${fileDirname}` when there are is no open workspace.
- **Attach to…** command is now active even when already in a debug session allowing to attach to multiple sockets concurrently.
- Simplify REPL banner to be one line. 

## 0.2.2
- Add **Attach to…** command to start an attach session via host:port or socket.
- Debugger now waits by default up to 5000ms for the socket to appear when attaching.
  - `tracciatto`-type gets a `socketTimeoutMs` option to control the timeout, with 0 meaning no-wait. 

## 0.2.1
- Add `tracciatto.debug.preferBundler` setting to use `bundle exec` to run `tracciatto.debug.runtimeExecutable` if workspace contains a `Gemfile`. 
- Backward compatibility with `rdbg`:
  - Add `showProtocolLog` but prefer `tracciatto.logDapMessages` setting.
  - Add `useBundler` but prefer `tracciatto.debug.preferBundler` setting.
- Fix: `tracciatto.debug.runtimeExecutable` fails to be validated if it is a command with arguments (e.g. `bundle exec`).

## 0.2.0
- Add **Exception Filters** view to manage which exception types the debugger should break on.
- Add `tracciatto.logDapMessages` setting to log DAP messages as trace entries.
- Rename `tracciatto.runtimeExecutable` setting to `tracciatto.debug.runtimeExecutable`.

## 0.1.4
- Fix: `DebugConfigurationProvider` should set a default only for required values for the specific configuration type.
- Filter out empty or unsupported-type skip-paths.
- Handle missing socket explicitly. 

## 0.1.3
- Implement `skip_path` support based on a custom DAP request.
  - Adds support for these paths in `attach` configurations. 
  - Fix: `RUBY_DEBUG_SKIP_PATH` is not parsed in server mode, it cannot support current skip_path feature.
- Fix: `rdbgPath` config value handled as folder instead of file path.

## 0.1.2
- Add **Run Active Editor** for `ruby` files.

## 0.1.1
- Document `vscode-rdbg`'s `rdbg` debug-type compatibility.
- Enable `rdbg` debug-type support whenever `vscode-rdbg` extension is not active.
- Improve `rdbg` execution logging.

## 0.1.0
- Initial release.