import * as vscode from 'vscode';
import { ExtensionContext } from '../../extensionContext';
import { DebugSession } from '../debugSession';

export abstract class SessionController implements vscode.Disposable {
  protected readonly disposables: vscode.Disposable[];
  private initialized: boolean;

  constructor(
    protected readonly context: ExtensionContext,
    protected readonly session: DebugSession,
  ) {
    this.initialized = false;
    this.disposables = [];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
    this.disposables.length = 0;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.onInitialize();
    this.initialized = true;
  }

  protected abstract onInitialize(): Promise<void>;
}
