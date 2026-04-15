import * as vscode from 'vscode';
import { basename } from 'path';
import { ExtensionContext } from '../extensionContext';

/**
 * Run the currently active Ruby editor.
 */
export async function runEditor(
  context: ExtensionContext,
  textEditor: vscode.TextEditor,
): Promise<boolean> {
  if (textEditor.document.languageId !== 'ruby') {
    vscode.window.showErrorMessage('Only Ruby files can be run');
    return false;
  }

  return runFile(context, textEditor.document.uri);
}

async function runFile(context: ExtensionContext, uri: vscode.Uri): Promise<boolean> {
  if (uri.scheme !== 'file') {
    vscode.window.showErrorMessage('Only local files can be run');
    return false;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const targetPath = vscode.workspace.asRelativePath(uri, false);
  await executeCommandsInTerminal({
    commands: [`${context.configuration.getRuntimeExecutable(workspaceFolder)} ${targetPath}`],
    cwd: workspaceFolder?.uri,
    name: `Run ${basename(targetPath)}`,
  });
  return true;
}

async function executeCommandsInTerminal(options: {
  commands: string[];
  cwd?: string | vscode.Uri;
  iconPath?: vscode.IconPath;
  name?: string;
  preserveFocus?: boolean;
}) {
  const cmd = options.commands.join(' && ').trim();
  const terminalOptions: vscode.TerminalOptions = {
    cwd: options.cwd,
    iconPath: new vscode.ThemeIcon('ruby'),
    message: `\x1b[1mRunning:\x1b[0m ${cmd}`,
    name: options.name,
  };
  if (process.platform === 'win32') {
    terminalOptions.shellArgs = ['/K', `${cmd} && pause`];
    terminalOptions.shellPath = 'cmd.exe';
  } else {
    terminalOptions.shellArgs = ['-c', `${cmd}; read -n1 -rsp "Press any key to continue ..."`];
    terminalOptions.shellPath = '/bin/bash';
  }

  const terminal = vscode.window.createTerminal(terminalOptions);
  terminal.show(options.preserveFocus);
  return terminal;
}
