import * as vscode from 'vscode';
import { DebugType } from '../../constants';

export interface DebugConfiguration extends vscode.DebugConfiguration {
  rdbgPath?: string;
  skipPaths: string[];
  type: DebugType;
}

export interface SocketDebugConfiguration extends DebugConfiguration {
  host?: never;
  port?: never;
  socket: string;
  socketTimeoutMs?: number;
}

export interface TcpDebugConfiguration extends DebugConfiguration {
  host: string;
  port: number;
  socket?: never;
  socketTimeoutMs?: never;
}
