import * as vscode from 'vscode';
import type { DebugProtocol } from 'vscode-debugprotocol';
import { ExtensionContext } from '../extensionContext';
import { ExceptionSessionController } from './controllers/exceptionSessionController';
import { SkipPathsSessionController } from './controllers/skipPathsSessionController';
import {
  isEventMessage,
  isResponseMessage,
  KnownEvent,
  KnownResponse,
} from './debugProtocolMessage';
import { DebugSession, DebugSessionState, DEFAULT_MAX_INSPECTED_LENGTH } from './debugSession';

const SIMPLE_TYPES = new Set([
  'Complex',
  'BigDecimal',
  'FalseClass',
  'Float',
  'Integer',
  'NilClass',
  'Rational',
  'Regexp',
  'String',
  'Symbol',
  'Time',
  'TrueClass',
]);

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
  private interceptWelcome: boolean;
  private logDapMessages: boolean;
  private maxInspectedValueLength?: number;
  private patchSimpleTypeExpansion: boolean;
  protected readonly skipPathsController: SkipPathsSessionController;

  constructor(
    protected readonly context: ExtensionContext,
    session: vscode.DebugSession,
  ) {
    const { configuration } = this.context;
    const { workspaceFolder } = session;

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
            this.debugSession.setMaxInspectedValueLength(this.maxInspectedValueLength);
          } else if (
            e.affectsConfiguration('tracciatto.patchSimpleTypeExpansion', workspaceFolder)
          ) {
            this.patchSimpleTypeExpansion =
              configuration.getPatchSimpleTypeExpansion(workspaceFolder);
          }
        }
      }),
    ];

    this.context.activeDebugSession = this.debugSession;
    this.logDapMessages =
      Boolean(session.configuration.showProtocolLog) ||
      configuration.getLogDapMessages(workspaceFolder);
    this.maxInspectedValueLength = configuration.getPatchMaxInspectedValueLength(workspaceFolder);
    this.patchSimpleTypeExpansion = configuration.getPatchSimpleTypeExpansion(workspaceFolder);
  }

  dispose(): void {
    this.context.activeDebugSession = undefined;
    vscode.Disposable.from(...this.disposables).dispose();
    this.disposables.length = 0;
  }

  public get id(): string {
    return this.debugSession.id;
  }

  async onDidSendMessage(message: DebugProtocol.ProtocolMessage): Promise<void> {
    if (this.logDapMessages) {
      this.context.log.trace(`[${this.id}] dap.message(in)`, message);
    }

    if (isEventMessage(message)) {
      await this.onDidSendEventMessage(message);
    } else if (isResponseMessage(message)) {
      await this.onDidSendResponseMessage(message);
    }
  }

  protected async onDidSendEventMessage(message: KnownEvent): Promise<void> {
    switch (message.event) {
      case 'initialized':
        this.context.log.debug(`[${this.id}] Session initialized`);
        await this.debugSession.initialize();
        await Promise.all([
          this.exceptionController.initialize(),
          this.skipPathsController.initialize(),
        ]);
        if (
          this.maxInspectedValueLength !== undefined &&
          this.maxInspectedValueLength !== DEFAULT_MAX_INSPECTED_LENGTH
        ) {
          await this.debugSession.setMaxInspectedValueLength(this.maxInspectedValueLength);
        }
        break;

      case 'output':
        if (this.interceptWelcome && message.body.output.startsWith('Ruby REPL:')) {
          message.body.output = 'Ruby REPL: Use `,help` to list all debug commands\n';
          this.interceptWelcome = false;
        }
        break;

      case 'stopped':
        this.context.log.debug(`[${this.id}] Session stopped (${message.body?.reason ?? ''})`);
        this.debugSession.state = DebugSessionState.Paused;
        break;

      case 'terminated':
        this.context.log.debug(`[${this.id}] Session terminated`);
        this.debugSession.state = DebugSessionState.Terminated;
        break;
    }
  }

  protected async onDidSendResponseMessage(message: KnownResponse): Promise<void> {
    if (!message.success) {
      return;
    }

    switch (message.command) {
      case 'continue':
        this.debugSession.state = DebugSessionState.Running;
        break;

      case 'disconnect':
        this.context.log.debug(`[${this.id}] Session disconnected`);
        this.debugSession.state = DebugSessionState.Terminated;
        break;

      case 'evaluate':
      case 'setVariable':
        if (
          this.patchSimpleTypeExpansion &&
          message.body.type &&
          SIMPLE_TYPES.has(message.body.type)
        ) {
          message.body.variablesReference = 0;
        }
        break;

      case 'initialize':
        if (message.success) {
          message.body.supportsStepBack = false;
        }
        break;

      case 'variables':
        if (this.patchSimpleTypeExpansion) {
          for (const variable of message.body.variables) {
            if (variable.type && SIMPLE_TYPES.has(variable.type)) {
              variable.variablesReference = 0;
            }
          }
        }
        break;
    }
  }

  onWillReceiveMessage(message: DebugProtocol.ProtocolMessage): void {
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
}
