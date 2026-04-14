import * as vscode from 'vscode';
import { Configuration } from './configuration';

export class ExtensionContext {
  public readonly configuration: Configuration;
  public readonly log: vscode.LogOutputChannel;

  constructor(public readonly extensionContext: vscode.ExtensionContext) {
    this.configuration = new Configuration();
    this.log = vscode.window.createOutputChannel('Tracciatto', { log: true });
    this.disposables.push(this.log);
  }

  public get disposables(): vscode.Disposable[] {
    return this.extensionContext.subscriptions;
  }
}
