import * as vscode from 'vscode';
import type { DebugProtocol } from 'vscode-debugprotocol';
import { ExtensionContext } from '../extensionContext';
import { ExceptionSessionController } from './controllers/exceptionSessionController';
import { SkipPathsSessionController } from './controllers/skipPathsSessionController';

/**
 * This class tracks communication with rdbg DAP and signals appropriate session
 * components for initialization. It is {@link vscode.Disposable Disposable} but
 * it self-disposes when the associated session is stopped so callers do not need
 * to assume responsability for disposal.
 */
export class DebugAdapterTracker implements vscode.DebugAdapterTracker, vscode.Disposable {
  private readonly disposables: vscode.Disposable[];
  private readonly exceptionController: ExceptionSessionController;
  private logDapMessages: boolean;
  private readonly skipPathsController: SkipPathsSessionController;

  constructor(
    private readonly context: ExtensionContext,
    private readonly session: vscode.DebugSession,
  ) {
    this.exceptionController = new ExceptionSessionController(this.context, this.session);
    this.skipPathsController = new SkipPathsSessionController(this.context, this.session);
    this.disposables = [
      this.exceptionController,
      this.skipPathsController,
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('tracciatto.logDapMessages', this.session.workspaceFolder)) {
          this.logDapMessages = this.context.configuration.getLogDapMessages(
            this.session.workspaceFolder,
          );
        }
      }),
    ];

    this.logDapMessages =
      Boolean(this.session.configuration.showProtocolLog) ||
      this.context.configuration.getLogDapMessages(this.session.workspaceFolder);
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
    this.disposables.length = 0;
  }

  async onDidSendMessage(message: DebugProtocol.ProtocolMessage): Promise<void> {
    if (this.logDapMessages) {
      this.context.log.trace(`[${this.session.id}] dap.message`, message);
    }

    if (message.type !== 'event') {
      return;
    }

    const eventMessage = message as DebugProtocol.Event;
    switch (eventMessage.event) {
      case 'initialized':
        this.context.log.debug(`[${this.session.id}] Session initialized`);
        await this.exceptionController.initialize();
        await this.skipPathsController.initialize();
        break;

      case 'stopped':
        this.context.log.debug(
          `[${this.session.id}] Session stopped (${eventMessage.body?.reason ?? ''})`,
        );
        break;

      case 'terminated':
        this.context.log.debug(`[${this.session.id}] Session terminated`);
        break;
    }
  }

  onExit() {
    this.dispose();
  }

  onWillStopSession() {
    this.dispose();
  }
}
