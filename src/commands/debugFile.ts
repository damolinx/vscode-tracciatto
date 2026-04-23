import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../extensionContext';
import { LaunchConfiguration } from '../rdbg/configurations/launchConfiguration';

export async function debugEditor(
  context: ExtensionContext,
  textEditor: vscode.TextEditor,
): Promise<boolean> {
  if (textEditor.document.languageId !== 'ruby') {
    vscode.window.showErrorMessage('Only Ruby files can be debugged');
    return false;
  }

  return debugFile(context, textEditor.document.uri);
}

async function debugFile(context: ExtensionContext, uri: vscode.Uri): Promise<boolean> {
  if (uri.scheme !== 'file') {
    vscode.window.showErrorMessage('Only local files can be debugged');
    return false;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const config = {
    type: 'tracciatto',
    request: 'launch',
    name: `Debug ${path.basename(uri.fsPath)}`,
    program: vscode.workspace.asRelativePath(uri.fsPath),
    runtimeExecutable: context.configuration.getRuntimeExecutable(workspaceFolder),
    skipPaths: [],
  } as LaunchConfiguration;

  return vscode.debug.startDebugging(workspaceFolder, config);
}
