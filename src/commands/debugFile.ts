import * as vscode from 'vscode';
import * as path from 'path';
import { TRACIATTO_TYPE } from '../constants';
import { ExtensionContext } from '../extensionContext';

/**
 * Debug the currently active Ruby editor.
 */
export function debugEditor(context: ExtensionContext, textEditor: vscode.TextEditor): void {
  if (textEditor.document.languageId !== 'ruby') {
    vscode.window.showErrorMessage('Only Ruby files can be debugged');
    return;
  }
  return debugFile(context, textEditor.document.uri);
}

function debugFile(context: ExtensionContext, uri: vscode.Uri): void {
  if (uri.scheme !== 'file') {
    vscode.window.showErrorMessage('Only local files can be debugged');
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const program = uri.fsPath;
  const config: vscode.DebugConfiguration = {
    type: TRACIATTO_TYPE,
    request: 'launch',
    name: `Debug ${path.basename(uri.fsPath)}`,
    program,
    runtimeExecutable: context.configuration.getRuntimeExecutable(workspaceFolder),
  };

  vscode.debug.startDebugging(workspaceFolder, config);
}
