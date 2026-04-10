import * as vscode from 'vscode';
import { debugEditor } from './commands/debugFile';
import { RDBG_TYPE, TRACIATTO_TYPE } from './constants';
import { registerRdbgDebugAdapterFactory } from './debuggers/rdbgDebugAdapterFactory';
import { ExtensionContext } from './extensionContext';
import { registerRdbgConfigurationProvider } from './providers/rdbgConfigurationProvider';
import { registerTraciattoConfigurationProvider } from './providers/traciattoConfigurationProvider';

export function activate(extensionContext: vscode.ExtensionContext) {
  const context = new ExtensionContext(extensionContext);
  context.log.info('Activating extension', extensionContext.extension.packageJSON.version);

  const {
    commands: { registerTextEditorCommand: tcr },
  } = vscode;
  context.disposables.push(
    tcr('traciatto.debugFile', (textEditor: vscode.TextEditor) => debugEditor(context, textEditor)),
  );

  registerTraciattoConfigurationProvider(context);
  registerRdbgDebugAdapterFactory(context, TRACIATTO_TYPE);
  context.log.info(`Enabled '${TRACIATTO_TYPE}' debug-type`);

  const rdbgExt = vscode.extensions.getExtension('KoichiSasada.vscode-rdbg');
  if (!rdbgExt) {
    registerRdbgConfigurationProvider(context);
    registerRdbgDebugAdapterFactory(context, RDBG_TYPE);
    context.log.info(`Enabled '${RDBG_TYPE}' debug-type`);
  } else {
    context.log.warn(`Not enabling '${RDBG_TYPE}' debug-type, vscode-rdbg is present`);
  }
}
