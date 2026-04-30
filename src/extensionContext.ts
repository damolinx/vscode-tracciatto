import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { ExceptionManager } from './exceptions/exceptionManager';
import { DebugSession } from './rdbg/debugSession';
import { SkipPathProvider } from './skipPaths/skipPathProvider';

export class ExtensionContext {
  private _activeDebugSession?: DebugSession;
  private _supportRdbgDebugType?: boolean;
  public readonly configuration: Configuration;
  public readonly exceptionManager: ExceptionManager;
  public readonly log: vscode.LogOutputChannel;
  public readonly skipPathProvider: SkipPathProvider;

  constructor(public readonly extensionContext: vscode.ExtensionContext) {
    this.configuration = new Configuration();
    this.log = vscode.window.createOutputChannel('Tracciatto', { log: true });

    this.exceptionManager = new ExceptionManager(this.extensionContext, this.log);
    this.skipPathProvider = new SkipPathProvider(this.configuration, this.log);
    this.disposables.push(this.exceptionManager, this.log);
  }

  public get activeDebugSession(): DebugSession | undefined {
    return this._activeDebugSession;
  }

  public set activeDebugSession(value: DebugSession | undefined) {
    this._activeDebugSession = value;
    this.log.trace(value ? `Set active debug session: ${value.id}` : 'Unset active debug session');
  }

  public get disposables(): vscode.Disposable[] {
    return this.extensionContext.subscriptions;
  }

  public get supportRdbgDebugType(): boolean {
    this._supportRdbgDebugType ??= !vscode.extensions.getExtension('KoichiSasada.vscode-rdbg')
      ?.isActive;
    return this._supportRdbgDebugType;
  }
}
