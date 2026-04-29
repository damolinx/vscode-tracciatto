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
  protected readonly disposables: vscode.Disposable[];
  protected readonly debugSession: DebugSession;
  protected readonly exceptionController: ExceptionSessionController;
  protected readonly id: string;
  private interceptWelcome: boolean;
  private logDapMessages: boolean;
  private maxInspectedValueLength?: number;
  private patchNilExpansion: boolean;
  protected readonly skipPathsController: SkipPathsSessionController;

  constructor(
    protected readonly context: ExtensionContext,
    session: vscode.DebugSession,
  ) {
    const { configuration } = this.context;
    const {
      configuration: { showProtocolLog },
      id,
      workspaceFolder,
    } = session;

    this.id = id.slice(0, 8);
    this.interceptWelcome = true;
    this.disposables = [
      (this.debugSession = new DebugSession(this.context, session)),
      (this.exceptionController = new ExceptionSessionController(this.context, this.debugSession)),
      (this.skipPathsController = new SkipPathsSessionController(this.context, this.debugSession)),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('tracciatto')) {
          if (e.affectsConfiguration('tracciatto.logDapMessages', workspaceFolder)) {
            this.logDapMessages = configuration.getLogDapMessages(workspaceFolder);
          } else if (e.affectsConfiguration('tracciatto.patchMaxInspectedValueLength')) {
            this.maxInspectedValueLength =
              configuration.getPatchMaxInspectedValueLength(workspaceFolder);
            this.patchMaxInspectedValueLength(false);
          } else if (
            e.affectsConfiguration('tracciatto.patchNilVariableExpansion', workspaceFolder)
          ) {
            this.patchNilExpansion = configuration.getPatchNilVariableExpansion(workspaceFolder);
          }
        }
      }),
    ];

    this.context.activeDebugSession = this.debugSession;
    this.logDapMessages =
      Boolean(showProtocolLog) || configuration.getLogDapMessages(workspaceFolder);
    this.maxInspectedValueLength = configuration.getPatchMaxInspectedValueLength(workspaceFolder);
    this.patchNilExpansion = configuration.getPatchNilVariableExpansion(workspaceFolder);
  }

  dispose(): void {
    this.context.activeDebugSession = undefined;
    vscode.Disposable.from(...this.disposables).dispose();
    this.disposables.length = 0;
  }

  protected isEventMessage(message: DebugProtocol.ProtocolMessage): message is DebugProtocol.Event {
    return message.type === 'event';
  }

  protected isResponseMessage(
    message: DebugProtocol.ProtocolMessage,
  ): message is DebugProtocol.Response {
    return message.type === 'response';
  }

  async onDidSendMessage(message: DebugProtocol.ProtocolMessage): Promise<void> {
    if (this.logDapMessages) {
      this.context.log.trace(`[${this.id}] dap.message(in)`, message);
    }

    if (this.isEventMessage(message)) {
      switch (message.event) {
        case 'initialized':
          this.context.log.debug(`[${this.id}] Session initialized`);
          await this.debugSession.initialize();
          await Promise.all([
            this.exceptionController.initialize(),
            this.skipPathsController.initialize(),
          ]);
          await this.patchMaxInspectedValueLength(true);
          break;

        case 'output':
          if (this.interceptWelcome && message.body) {
            if (message.body.output.startsWith('Ruby REPL:')) {
              message.body.output = 'Ruby REPL: Use `,help` to list all debug commands\n';
              this.interceptWelcome = false;
            }
          }
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

        case 'evaluate':
          if (this.patchNilExpansion && message.body?.result === 'nil') {
            message.body.variablesReference = 0;
          }
          break;

        case 'variables':
          if (this.patchNilExpansion && message.body?.variables?.length) {
            for (const variable of message.body.variables) {
              if (variable.value === 'nil') {
                variable.variablesReference = 0;
              }
            }
          }
          break;
      }
    }
  }

  onWillReceiveMessage(message: any): void {
    if (this.logDapMessages) {
      this.context.log.trace(`[${this.id}] dap.message(out)`, message);
    }
  }

  onExit(_code: number | undefined, _signal: string | undefined) {
    this.dispose();
  }

  onWillStopSession() {
    this.dispose();
  }

  private async patchMaxInspectedValueLength(initialization: boolean): Promise<void> {
    if (
      initialization &&
      (this.maxInspectedValueLength == undefined || this.maxInspectedValueLength === 180)
    ) {
      return;
    }
    const value = this.maxInspectedValueLength ?? 180;
    await this.debugSession.sendEvalRequest(`DEBUGGER__::ThreadClient::MAX_LENGTH = ${value}`);
    this.context.log.warn(
      `[${this.id}] Patched DEBUGGER__::ThreadClient::MAX_LENGTH=${this.maxInspectedValueLength ?? 180}`,
    );
  }
}
