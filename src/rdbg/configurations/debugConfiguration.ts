import * as vscode from 'vscode';
import { DebugType } from '../../constants';

export interface DebugConfiguration extends vscode.DebugConfiguration {
  rdbgPath?: string;
  skipPaths: string[];
  type: DebugType;
}
