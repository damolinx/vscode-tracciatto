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

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
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
