import * as vscode from 'vscode';

export const EXTENSION_PREFIX = 'tracciatto';
export const LOCALHOST = '127.0.0.1';

// Last known default: https://github.com/ruby/debug/blob/95997c297acd7adc20be81b52d2d1405805671d2/lib/debug/server_dap.rb#L776
export const DEFAULT_MAX_INSPECTED_LENGTH = 180;
export const DEFAULT_SKIP_PATHS_FILENAME = '.tracciatto-skip-paths';

export const DEBUG_TYPES = ['rdbg', 'tracciatto'] as const;
export type DebugType = (typeof DEBUG_TYPES)[number];

export function isDebugType(value: string): value is DebugType {
  return DEBUG_TYPES.includes(value as DebugType);
}

export const DOCUMENT_SELECTOR: readonly vscode.DocumentFilter[] = [{ language: 'ruby' }];
