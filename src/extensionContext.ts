import * as vscode from 'vscode';
import { Configuration } from './configuration';

export class ExtensionContext {
  public readonly log: vscode.LogOutputChannel;
  public readonly configuration: Configuration;

  constructor(public readonly extensionContext: vscode.ExtensionContext) {
    this.configuration = new Configuration();
    this.log = vscode.window.createOutputChannel('Traciatto', { log: true });
    this.disposables.push(this.log);
  }

  public get disposables(): vscode.Disposable[] {
    return this.extensionContext.subscriptions;
  }
}
