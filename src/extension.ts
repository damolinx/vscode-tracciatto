import * as vscode from 'vscode';
import { addException } from './commands/addException';
import { attach } from './commands/attach';
import { debugEditor } from './commands/debugFile';
import { editException } from './commands/editException';
import { removeException } from './commands/removeException';
import { runEditor } from './commands/runFile';
import { toggleException } from './commands/toggleException';
import {
  ExceptionTreeNode,
  GroupTreeNode,
  registerExceptionTree,
} from './exceptions/exceptionTreeProvider';
import { ExtensionContext } from './extensionContext';
import { registerRdbgConfigurationProvider } from './providers/rdbgConfigurationProvider';
import { registerTracciattoConfigurationProvider } from './providers/tracciattoConfigurationProvider';
import { registerDebugAdapterDescriptorFactory } from './rdbg/debugAdapterDescriptorFactory';
import { registerDebugAdapterTrackerFactory } from './rdbg/debugAdapterTrackerFactory';

export function activate(extensionContext: vscode.ExtensionContext) {
  const context = new ExtensionContext(extensionContext);
  context.log.info('Activating extension', extensionContext.extension.packageJSON.version);

  registerExceptionTree(context);

  const {
    commands: { registerCommand: cr, registerTextEditorCommand: tcr },
  } = vscode;
  context.disposables.push(
    cr('tracciatto.addException', (nameOrNode?: string | GroupTreeNode) =>
      addException(context, nameOrNode),
    ),
    cr('tracciatto.attach', (portOrSocket?: string) => attach(context, portOrSocket)),
    cr('tracciatto.editException', (nameOrNode: string | ExceptionTreeNode) =>
      editException(context, nameOrNode),
    ),
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

  registerTracciattoDebugger(context);
  registerRdbgDebugger(context);
}

function registerRdbgDebugger(context: ExtensionContext): void {
  const vscodeRdbgExt = vscode.extensions.getExtension('KoichiSasada.vscode-rdbg');
  if (vscodeRdbgExt) {
    if (vscodeRdbgExt.isActive) {
      context.log.warn("'rdbg' debug-type not enabled (vscode-rdbg is active)");
      return;
    }

    if (!context.configuration.resolveValue('forceEnableRdbgDebugType', false)) {
      context.log.warn(
        "'rdbg' debug-type not enabled (vscode-rdbg is present; disable extension and use `tracciatto.forceEnableRdbgDebugType`)",
      );
      return;
    }
  }

  try {
    registerDebugAdapterDescriptorFactory(context, 'rdbg');
    registerDebugAdapterTrackerFactory(context, 'rdbg');
    registerRdbgConfigurationProvider(context);
    context.log.info("Enabled 'rdbg' debug-type");
  } catch (error: any) {
    context.log.error(
      `Failed to enable 'rdbg' debug-type; this may occur if another extension registered it first. Error: ${error?.message}`,
    );
  }
}

function registerTracciattoDebugger(context: ExtensionContext): void {
  registerTracciattoConfigurationProvider(context);
  registerDebugAdapterDescriptorFactory(context, 'tracciatto');
  registerDebugAdapterTrackerFactory(context, 'tracciatto');
  context.log.info("Enabled 'tracciatto' debug-type");
}
