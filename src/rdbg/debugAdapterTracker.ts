import * as vscode from 'vscode';
import type { DebugProtocol } from 'vscode-debugprotocol';
import { ExtensionContext } from '../extensionContext';
import { ExceptionSessionController } from './controllers/exceptionSessionController';
import { SkipPathsSessionController } from './controllers/skipPathsSessionController';
import { DebugSession } from './debugSession';

/**
 * This class tracks communication with rdbg DAP and signals appropriate session
 * components for initialization. It is {@link vscode.Disposable Disposable} but
 * it self-disposes when the associated session is stopped so callers do not need
 * to assume responsability for disposal.
 */
export class DebugAdapterTracker implements vscode.DebugAdapterTracker, vscode.Disposable {
  private readonly disposables: vscode.Disposable[];
  private readonly debugSession: DebugSession;
  private readonly exceptionController: ExceptionSessionController;
  private logDapMessages: boolean;
  private readonly skipPathsController: SkipPathsSessionController;

  constructor(
    private readonly context: ExtensionContext,
    private readonly session: vscode.DebugSession,
  ) {
    this.disposables = [
      (this.debugSession = new DebugSession(this.context, this.session)),
      (this.exceptionController = new ExceptionSessionController(this.context, this.session)),
      (this.skipPathsController = new SkipPathsSessionController(this.context, this.session)),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('tracciatto.logDapMessages', this.session.workspaceFolder)) {
          this.logDapMessages = this.context.configuration.getLogDapMessages(
            this.session.workspaceFolder,
          );
        }
      }),
    ];

    this.context.activeDebugSession = this.debugSession;
    this.logDapMessages =
      Boolean(this.session.configuration.showProtocolLog) ||
      this.context.configuration.getLogDapMessages(this.session.workspaceFolder);
  }

  dispose(): void {
    this.context.activeDebugSession = undefined;
    vscode.Disposable.from(...this.disposables).dispose();
    this.disposables.length = 0;
  }

  public get id(): string {
    return this.session.id;
  }

  private isEventMessage(msg: DebugProtocol.ProtocolMessage): msg is DebugProtocol.Event {
    return msg.type === 'event';
  }

  private isResponseMessage(msg: DebugProtocol.ProtocolMessage): msg is DebugProtocol.Response {
    return msg.type === 'response';
  }

  async onDidSendMessage(message: DebugProtocol.ProtocolMessage): Promise<void> {
    if (this.logDapMessages) {
      this.context.log.trace(`[${this.id}] dap.message`, message);
    }

    if (this.isEventMessage(message)) {
      switch (message.event) {
        case 'initialized':
          this.context.log.debug(`[${this.id}] Session initialized`);
          this.debugSession.initialize();
          await Promise.all([
            this.exceptionController.initialize(),
            this.skipPathsController.initialize(),
          ]);
          break;

        case 'stopped':
          this.context.log.debug(`[${this.id}] Session stopped (${message.body?.reason ?? ''})`);
          this.debugSession.markPaused();
          break;

        case 'terminated':
          this.context.log.debug(`[${this.id}] Session terminated`);
          this.debugSession.markTerminated();
          break;
      }
    } else if (this.isResponseMessage(message)) {
      switch (message.command) {
        case 'continue':
          if (message.success) {
            this.debugSession.markRunning();
          }
          break;
        case 'disconnect':
          if (message.success) {
            this.context.log.debug(`[${this.id}] Session disconnected`);
            this.debugSession.markTerminated();
          }
          break;
      }
    }
  }

  onExit(_code: number | undefined, _signal: string | undefined) {
    this.dispose();
  }

  onWillStopSession() {
    this.dispose();
  }
}
