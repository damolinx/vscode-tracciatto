import * as vscode from 'vscode';
import * as path from 'path';
import { DebugType, LOCALHOST } from '../../constants';
import { SocketDebugConfiguration, TcpDebugConfiguration } from './debugConfiguration';

export type LaunchConfiguration = (SocketDebugConfiguration | TcpDebugConfiguration) & {
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  program: string;
  runtimeExecutable?: string;
  useTerminal?: boolean;
};

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
    host: LOCALHOST,
    port: 0,
    skipPaths: [],
    useTerminal: false,
  } as LaunchConfiguration;

  return config;
}
