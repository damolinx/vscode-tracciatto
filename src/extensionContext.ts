import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { ExceptionManager } from './exceptions/exceptionManager';

export class ExtensionContext {
  private _supportRdbgDebugType?: boolean;
  public readonly configuration: Configuration;
  public readonly exceptionManager: ExceptionManager;
  public readonly log: vscode.LogOutputChannel;

  constructor(public readonly extensionContext: vscode.ExtensionContext) {
    this.configuration = new Configuration();
    this.log = vscode.window.createOutputChannel('Tracciatto', { log: true });

    this.exceptionManager = new ExceptionManager(this.extensionContext, this.log);
    this.disposables.push(this.exceptionManager, this.log);
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
