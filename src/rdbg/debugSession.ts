import * as vscode from 'vscode';
import { DEFAULT_MAX_INSPECTED_LENGTH } from '../constants';
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
  public readonly shortId: string;

  constructor(
    private readonly context: ExtensionContext,
    private readonly session: vscode.DebugSession,
  ) {
    this._state = DebugSessionState.Uninitialized;
    this.shortId = this.session.id.slice(0, 8);
  }

  dispose() {
    this.state = DebugSessionState.Terminated;
  }

  public get configuration(): DebugConfiguration {
    return this.session.configuration as DebugConfiguration;
  }

  public get frameId(): number | undefined {
    return vscode.debug.activeStackItem?.session.id === this.id
      ? (vscode.debug.activeStackItem as vscode.DebugStackFrame).frameId
      : undefined;
  }

  public get id(): string {
    return this.session.id;
  }

  public get threadId(): number | undefined {
    return vscode.debug.activeStackItem?.session.id === this.id
      ? (vscode.debug.activeStackItem as vscode.DebugThread).threadId
      : undefined;
  }

  public async initialize(): Promise<void> {
    this.state = DebugSessionState.Running;
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
      const message = `[${this.shortId}] Failed request: '${command}', ${JSON.stringify(args)} - Error:`;
      if (error?.message !== 'Canceled') {
        this.context.log.error(message, error);
      } else {
        this.context.log.debug(message, error);
      }
      throw error;
    }
  }

  public async setMaxInspectedValueLength(length = DEFAULT_MAX_INSPECTED_LENGTH): Promise<void> {
    if (length <= 0) {
      this.context.log.warn(
        `[${this.shortId}] DEBUGGER__::ThreadClient::MAX_LENGTH must be a value number greater than 0`,
      );
      return;
    }

    await this.sendEvaluateRequest(
      `DEBUGGER__::ThreadClient.send(:remove_const, :MAX_LENGTH) rescue nil; DEBUGGER__::ThreadClient::MAX_LENGTH = ${length}`,
    );
    this.context.log.debug(`[${this.shortId}] DEBUGGER__::ThreadClient::MAX_LENGTH=${length}`);
  }

  public get state(): DebugSessionState {
    return this._state;
  }

  public set state(value: DebugSessionState) {
    this._state = value;
  }
}
