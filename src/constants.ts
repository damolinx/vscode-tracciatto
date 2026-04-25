import * as vscode from 'vscode';

export const EXTENSION_PREFIX = 'tracciatto';
export const LOCALHOST = '127.0.0.1';

export const DEFAULT_SKIP_PATHS_FILENAME = '.tracciatto-skip-paths';

export const DEBUG_TYPES = ['rdbg', 'tracciatto'] as const;
export type DebugType = (typeof DEBUG_TYPES)[number];

export function isDebugType(value: string): value is DebugType {
  return DEBUG_TYPES.includes(value as DebugType);
}

export const DOCUMENT_SELECTOR: readonly vscode.DocumentFilter[] = [{ language: 'ruby' }];
