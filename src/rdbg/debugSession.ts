import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { DebugConfiguration } from './configurations/debugConfiguration';

export enum DebugSessionState {
  Uninitialized = 'uninitialized',
  Running = 'running',
  Paused = 'paused',
  Terminated = 'terminated',
}

export class DebugSession implements vscode.Disposable {
  private _state: DebugSessionState;
  public readonly id: string;

  constructor(
    private readonly context: ExtensionContext,
    private readonly session: vscode.DebugSession,
  ) {
    this._state = DebugSessionState.Uninitialized;
    this.id = this.session.id.slice(0, 8);
  }

  dispose() {
    this.markTerminated();
  }

  public get configuration(): DebugConfiguration {
    return this.session.configuration as DebugConfiguration;
  }

  public async initialize(): Promise<void> {
    this.markRunning();
  }

  public markPaused(): void {
    this._state = DebugSessionState.Paused;
  }

  public markRunning(): void {
    this._state = DebugSessionState.Running;
  }

  public markTerminated(): void {
    this._state = DebugSessionState.Terminated;
  }

  public sendEvaluateRequest(expression: string, useEval = true): Promise<void> {
    return this.sendRequest('evaluate', {
      expression: useEval ? `,eval ${expression}` : `,${expression}`,
    });
  }

  public async sendRequest(command: string, args: any): Promise<void> {
    try {
      const result = await this.session.customRequest(command, args);
      return result;
    } catch (error: any) {
      const message = `[${this.id}] Failed request: '${command}', ${JSON.stringify(args)} - Error:`;
      if (error?.message !== 'Canceled') {
        this.context.log.error(message, error);
      } else {
        this.context.log.debug(message, error);
      }
      throw error;
    }
  }

  public get state(): DebugSessionState {
    return this._state;
  }
}
