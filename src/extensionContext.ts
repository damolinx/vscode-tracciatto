import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { ExceptionManager } from './exceptions/exceptionManager';
import { RubyEnvProvider } from './providers/rubyEnvProvider';
import { SkipPathProvider } from './providers/skipPathProvider';

export class ExtensionContext {
  public readonly configuration: Configuration;
  public readonly exceptionManager: ExceptionManager;
  public readonly log: vscode.LogOutputChannel;
  private readonly pendingRestart: Map<string, boolean>;
  public readonly rubyEnvProvider: RubyEnvProvider;
  public readonly skipPathProvider: SkipPathProvider;

  constructor(public readonly extensionContext: vscode.ExtensionContext) {
    this.configuration = new Configuration();
    this.log = vscode.window.createOutputChannel('Tracciatto', { log: true });

    this.exceptionManager = new ExceptionManager(this.extensionContext, this.log);
    this.pendingRestart = new Map();
    this.rubyEnvProvider = new RubyEnvProvider(this.configuration, this.log);
    this.skipPathProvider = new SkipPathProvider(this.configuration, this.log);
    this.disposables.push(this.exceptionManager, this.rubyEnvProvider, this.log);
  }

  public get disposables(): vscode.Disposable[] {
    return this.extensionContext.subscriptions;
  }

  public resetPendingRestart(sessionId: string): boolean {
    const removed = this.pendingRestart.delete(sessionId);
    this.log.trace(`[${sessionId.slice(0, 8)}]: Reset pending restart. WasSet: ${removed}`);
    return removed;
  }

  public setPendingRestart(sessionId: string): void {
    this.log.trace(`[${sessionId.slice(0, 8)}]: Set pending restart`);
    this.pendingRestart.set(sessionId, true);
  }
}
