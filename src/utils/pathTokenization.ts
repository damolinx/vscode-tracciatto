import * as vscode from 'vscode';
import * as os from 'os';

export const USER_HOME_TOKEN = '${userHome}';
export const WORKSPACE_TOKEN = '${workspaceFolder}';

export function resolveTokenizedPath(
  rawValue: string,
  contextFolderOrUri?: vscode.Uri | vscode.WorkspaceFolder,
): string | undefined {
  const resolved = resolveTokens(rawValue, contextFolderOrUri);
  if (!resolved) {
    return;
  }

  try {
    return vscode.Uri.file(resolved).fsPath;
  } catch {
    return;
  }
}

function resolveTokens(
  tokenizedPath: string,
  contextFolderOrUri?: vscode.Uri | vscode.WorkspaceFolder,
): string | undefined {
  if (tokenizedPath.includes(USER_HOME_TOKEN)) {
    return tokenizedPath.replace(USER_HOME_TOKEN, os.homedir());
  }

  if (tokenizedPath.includes(WORKSPACE_TOKEN)) {
    if (vscode.workspace.workspaceFolders?.length === 0) {
      return;
    }

    const workspaceFolder = !contextFolderOrUri
      ? vscode.workspace.workspaceFolders?.[0]
      : contextFolderOrUri instanceof vscode.Uri
        ? vscode.workspace.getWorkspaceFolder(contextFolderOrUri)
        : contextFolderOrUri;
    return tokenizedPath.replace(WORKSPACE_TOKEN, workspaceFolder?.uri.fsPath ?? '');
  }

  return tokenizedPath;
}
