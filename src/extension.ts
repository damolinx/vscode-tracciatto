import * as vscode from 'vscode';
import { registerRdbgDebugAdapterFactory } from './debuggers/rdbgDebugAdapterFactory';
import { ExtensionContext } from './extensionContext';
import { registerTraciattoConfigProvider } from './providers/traciattoDebugConfigProvider';

export function activate(extensionContext: vscode.ExtensionContext) {
  const context = new ExtensionContext(extensionContext);
  context.log.info('Activating extension', extensionContext.extension.packageJSON.version);

  registerRdbgDebugAdapterFactory(context);
  registerTraciattoConfigProvider(context);
}
