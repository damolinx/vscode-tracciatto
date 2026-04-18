import * as vscode from 'vscode';
import { DebugType } from '../constants';

export interface DebugConfiguration extends vscode.DebugConfiguration {
  rdbgPath?: string;
  skipPaths: string[];
  type: DebugType;
}

export type AttachRdbgConfiguration =
  | (DebugConfiguration & {
      socket: string;
      host?: undefined;
      port?: undefined;
    })
  | (DebugConfiguration & {
      port: number;
      host: string;
      socket?: undefined;
    });

export interface LaunchRdbgConfiguration extends DebugConfiguration {
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  program: string;
  runtimeExecutable?: string;
}
