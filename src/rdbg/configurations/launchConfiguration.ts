import * as vscode from 'vscode';
import * as path from 'path';
import { DebugType } from '../../constants';
import { DebugConfiguration } from './debugConfiguration';

export interface LaunchConfiguration extends DebugConfiguration {
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  program: string;
  runtimeExecutable?: string;
}

export function createLaunchConfiguration(
  uri: vscode.Uri,
  type: DebugType = 'tracciatto',
): LaunchConfiguration {
  const config = {
    type,
    request: 'launch',
    name: `Debug ${path.basename(uri.fsPath)}`,
    program: vscode.workspace.asRelativePath(uri.fsPath),
    cwd: vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath ?? path.dirname(uri.fsPath),
    skipPaths: [],
  } as LaunchConfiguration;

  return config;
}
