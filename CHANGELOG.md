# Changelog

## 0.1.3
- Implement `skip_path` support based on a custom DAP request.
  - Adds support for these paths in `attach` configurations. 
  - Fix: `RUBY_DEBUG_SKIP_PATH` is not parsed in server mode, it cannot support current skip_path feature.
- Fix: `rdbgPath` config value handled as folder instead of file path

## 0.1.2
- Add **Run Active Editor** for `ruby` files.

## 0.1.1
- Document `vscode-rdbg`'s `rdbg` debug-type compatibility
- Enable `rdbg` debug-type support whenever `vscode-rdbg` extension is not active
- Improve `rdbg` execution logging

## 0.1.0
- Initial release