import * as vscode from 'vscode';

export interface RdbgDebugConfiguration extends vscode.DebugConfiguration {
  rdbgPath?: string;
  skipPaths: string[];
}

export type AttachRdbgConfiguration =
  | (RdbgDebugConfiguration & {
      socket: string;
      host?: undefined;
      port?: undefined;
    })
  | (RdbgDebugConfiguration & {
      port: number;
      host: string;
      socket?: undefined;
    });

export interface LaunchRdbgConfiguration extends RdbgDebugConfiguration {
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  program: string;
  runtimeExecutable?: string;
}
