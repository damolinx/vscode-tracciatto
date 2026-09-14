import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';

export async function shouldRunWithBundler(
  context: ExtensionContext,
  folder: vscode.WorkspaceFolder,
): Promise<boolean> {
  let shouldRunWithBundler = false;

  if (context.configuration.getPreferBundler(folder)) {
    try {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder.uri, 'Gemfile'));
      shouldRunWithBundler = (stat.type & vscode.FileType.File) === vscode.FileType.File;
    } catch {
      shouldRunWithBundler = false;
    }
  }

  return shouldRunWithBundler;
}
