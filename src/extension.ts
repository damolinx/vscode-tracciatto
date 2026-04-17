import * as vscode from 'vscode';
import { debugEditor } from './commands/debugFile';
import { runEditor } from './commands/runFile';
import { RDBG_TYPE, TRACCIATTO_TYPE as TRACCIATTO_TYPE } from './constants';
import { registerRdbgDebugAdapterDescriptorFactory } from './debuggers/rdbgDebugAdapterDescriptorFactory';
import { ExtensionContext } from './extensionContext';
import { registerRdbgConfigurationProvider } from './providers/rdbgConfigurationProvider';
import { registerTracciattoConfigurationProvider } from './providers/tracciattoConfigurationProvider';

export function activate(extensionContext: vscode.ExtensionContext) {
  const context = new ExtensionContext(extensionContext);
  context.log.info('Activating extension', extensionContext.extension.packageJSON.version);

  const {
    commands: { registerTextEditorCommand: tcr },
  } = vscode;
  context.disposables.push(
    tcr('tracciatto.debugFile', (textEditor: vscode.TextEditor) =>
      debugEditor(context, textEditor),
    ),
    tcr('tracciatto.runFile', (textEditor: vscode.TextEditor) => runEditor(context, textEditor)),
  );

  registerTracciattoConfigurationProvider(context);
  registerRdbgDebugAdapterDescriptorFactory(context, TRACCIATTO_TYPE);
  context.log.info(`Enabled '${TRACCIATTO_TYPE}' debug-type`);

  if (context.supportRdbgDebugType) {
    registerRdbgConfigurationProvider(context);
    registerRdbgDebugAdapterDescriptorFactory(context, RDBG_TYPE);
    context.log.info(`Enabled '${RDBG_TYPE}' debug-type`);
  } else {
    context.log.warn(`Not enabling '${RDBG_TYPE}' debug-type, vscode-rdbg is present`);
  }
}
