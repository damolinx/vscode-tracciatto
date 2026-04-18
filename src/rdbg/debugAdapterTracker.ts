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
  private exceptionController?: ExceptionSessionController;
  private skipPathsController?: SkipPathsSessionController;

  constructor(
    private readonly context: ExtensionContext,
    private readonly session: vscode.DebugSession,
  ) {}

  dispose(): void {
    this.exceptionController?.dispose();
    this.exceptionController = undefined;
  }

  async onDidSendMessage(message: DebugProtocol.ProtocolMessage): Promise<void> {
    if (this.context.configuration.getLogDapMessages(this.session.workspaceFolder)) {
      this.context.log.trace('dap.message', this.session.id, message);
    }

    if (message.type !== 'event') {
      return;
    }

    const eventMessage = message as DebugProtocol.Event;
    switch (eventMessage.event) {
      case 'breakpoint':
        this.context.log.debug('dap.event.breakpoint', this.session.id, {
          body: eventMessage.body,
        });
        break;

      case 'initialized':
        this.context.log.debug('dap.event.initialized', this.session.id);
        if (!this.exceptionController) {
          this.exceptionController = new ExceptionSessionController(this.context, this.session);
          await this.exceptionController.initialize();
        }
        if (!this.skipPathsController) {
          this.skipPathsController = new SkipPathsSessionController(this.context, this.session);
          await this.skipPathsController.initialize();
        }
        break;

      case 'stopped':
        this.context.log.debug('dap.event.stopped', this.session.id, {
          reason: eventMessage.body?.reason,
        });
        break;

      case 'terminated':
        this.context.log.debug('dap.event.terminated', this.session.id);
        break;
    }
  }

  onExit() {
    this.context.log.debug('dap.onExit', this.session.id);
    this.dispose();
  }

  onWillStopSession() {
    this.context.log.debug('dap.onWillStop', this.session.id);
    this.dispose();
  }
}
