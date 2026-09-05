import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import {
  createLaunchConfiguration,
  LaunchConfiguration,
} from '../rdbg/configurations/launchConfiguration';

export async function debugEditor(
  context: ExtensionContext,
  textEditor: vscode.TextEditor,
  options?: Partial<LaunchConfiguration>,
): Promise<boolean> {
  if (textEditor.document.languageId !== 'ruby') {
    context.log.error(`Cannot debug editor language: ${textEditor.document.languageId}`);
    vscode.window.showErrorMessage('Only Ruby files can be debugged');
    return false;
  }

  return debugFile(context, textEditor.document.uri, options);
}

async function debugFile(
  context: ExtensionContext,
  uri: vscode.Uri,
  options?: Partial<LaunchConfiguration>,
): Promise<boolean> {
  if (uri.scheme !== 'file') {
    context.log.error(`Cannot debug file scheme: ${uri.scheme}`);
    vscode.window.showErrorMessage('Only local files can be debugged');
    return false;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const config = createLaunchConfiguration(uri, 'tracciatto', options);
  context.log.info(`Debugging file: ${vscode.workspace.asRelativePath(uri)}`);
  return vscode.debug.startDebugging(workspaceFolder, config);
}
