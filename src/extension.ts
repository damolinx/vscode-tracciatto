import * as vscode from 'vscode';
import { addException } from './commands/addException';
import { attach } from './commands/attach';
import { debugEditor } from './commands/debugFile';
import { removeException } from './commands/removeException';
import { runEditor } from './commands/runFile';
import { toggleException } from './commands/toggleException';
import { DebugType } from './constants';
import {
  ExceptionTreeNode,
  ExceptionTreeProvider,
  GroupTreeNode,
} from './exceptions/exceptionTreeProvider';
import { ExtensionContext } from './extensionContext';
import { registerRdbgConfigurationProvider } from './providers/rdbgConfigurationProvider';
import { registerTracciattoConfigurationProvider } from './providers/tracciattoConfigurationProvider';
import { registerDebugAdapterDescriptorFactory } from './rdbg/debugAdapterDescriptorFactory';
import { registerDebugAdapterTrackerFactory } from './rdbg/debugAdapterTrackerFactory';

export function activate(extensionContext: vscode.ExtensionContext) {
  const context = new ExtensionContext(extensionContext);
  context.log.info('Activating extension', extensionContext.extension.packageJSON.version);

  const exceptionsTree = new ExceptionTreeProvider(context);
  const treeView = vscode.window.createTreeView('tracciatto.exceptions', {
    showCollapseAll: true,
    treeDataProvider: exceptionsTree,
  });
  context.disposables.push(exceptionsTree, treeView);

  const {
    commands: { registerCommand: cr, registerTextEditorCommand: tcr },
  } = vscode;
  context.disposables.push(
    cr('tracciatto.addException', (nameOrNode?: string | GroupTreeNode) =>
      addException(context, nameOrNode),
    ),
    cr('tracciatto.attach', (portOrSocket?: string) => attach(context, portOrSocket)),
    cr('tracciatto.removeException', (nameOrNode: string | ExceptionTreeNode) =>
      removeException(context, nameOrNode),
    ),
    cr('tracciatto.toggleException', (exceptionName: string) =>
      toggleException(context, exceptionName),
    ),

    tcr('tracciatto.debugFile', (textEditor: vscode.TextEditor) =>
      debugEditor(context, textEditor),
    ),
    tcr('tracciatto.runFile', (textEditor: vscode.TextEditor) => runEditor(context, textEditor)),
  );

  registerTracciattoConfigurationProvider(context);
  enableDebuggerType(context, 'tracciatto');

  if (context.supportRdbgDebugType) {
    registerRdbgConfigurationProvider(context);
    enableDebuggerType(context, 'rdbg');
  } else {
    context.log.warn("'rdbg' debug-type not enabled (vscode-rdbg is active)");
  }
}

function enableDebuggerType(context: ExtensionContext, type: DebugType) {
  registerDebugAdapterDescriptorFactory(context, type);
  registerDebugAdapterTrackerFactory(context, type);
  context.log.info(`Enabled '${type}' debug-type`);
}
