import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';

export enum DebugSessionState {
  Uninitialized = 'uninitialized',
  Running = 'running',
  Paused = 'paused',
  Terminated = 'terminated',
}

export class DebugSession implements vscode.Disposable {
  private state: DebugSessionState;
  constructor(
    protected readonly context: ExtensionContext,
    private readonly session: vscode.DebugSession,
  ) {
    this.state = DebugSessionState.Uninitialized;
  }

  dispose() {
    this.markTerminated();
  }

  public get currentState(): DebugSessionState {
    return this.state;
  }

  public get id(): string {
    return this.session.id;
  }

  public initialize(): void {
    this.markRunning();
  }

  public markPaused(): void {
    this.state = DebugSessionState.Paused;
  }

  public markRunning(): void {
    this.state = DebugSessionState.Running;
  }

  public markTerminated(): void {
    this.state = DebugSessionState.Terminated;
  }
}
