import * as vscode from 'vscode';
import { DebugType } from '../constants';

export interface DebugConfiguration extends vscode.DebugConfiguration {
  rdbgPath?: string;
  skipPaths: string[];
  type: DebugType;
}

export type AttachRdbgConfiguration =
  | (DebugConfiguration & {
      host?: never;
      port?: never;
      socket: string;
      socketTimeoutMs?: number;
    })
  | (DebugConfiguration & {
      port: number;
      host: string;
      socket?: never;
      socketTimeoutMs?: never;
    });

export interface LaunchRdbgConfiguration extends DebugConfiguration {
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  program: string;
  runtimeExecutable?: string;
}
