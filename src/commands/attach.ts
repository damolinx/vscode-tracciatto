import * as vscode from 'vscode';
import { lstatSync } from 'fs';
import { isAbsolute } from 'path';
import { ExtensionContext } from '../extensionContext';
import {
  createAttachConfiguration,
  parseHostPort,
} from '../rdbg/configurations/attachConfiguration';

export async function attach(context: ExtensionContext, portOrSocket?: string): Promise<boolean> {
  const targetPortOrSocket = portOrSocket ?? (await showPortOrSocketInputBox(context));
  if (!targetPortOrSocket) {
    return false;
  }

  const folders = vscode.workspace.workspaceFolders;
  const folder = folders?.length === 1 ? folders[0] : undefined;
  const config = createAttachConfiguration(targetPortOrSocket);
  return vscode.debug.startDebugging(folder, config);
}

async function showPortOrSocketInputBox(
  { extensionContext }: ExtensionContext,
  mruKey = 'attach.mruPortOrSocket',
): Promise<string | undefined> {
  let debounceTimer: NodeJS.Timeout | undefined;

  const value = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    placeHolder: 'e.g. 12345, 127.0.0.1:12345, /tmp/rdbg.sock',
    prompt: 'Enter a [host:]port or a socket path',
    validateInput: (value: string) =>
      new Promise((resolve) => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          const validation = validatePortOrSocket(value);
          if (!validation) {
            extensionContext.workspaceState.update(mruKey, value.trim());
          }
          resolve(validation);
        }, 250);
      }),
    value: extensionContext.workspaceState.get(mruKey),
  });

  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return;
  }

  return normalizedValue;
}

function validatePortOrSocket(value: string): string | undefined {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return;
  }

  const parsed = parseHostPort(normalizedValue);
  if (parsed) {
    if (!Number.isInteger(parsed.port) || parsed.port < 1024 || parsed.port > 65535) {
      return 'Port must be an integer between 1024 and 65535';
    }
    return;
  }

  if (!isAbsolute(normalizedValue)) {
    return 'Socket path must be an absolute path';
  }

  const stat = lstatSync(normalizedValue, { throwIfNoEntry: false });
  if (!stat) {
    return 'Socket path does not exist';
  }
  if (stat.isDirectory()) {
    return 'Socket path cannot be a directory';
  }
  if (process.platform !== 'win32' && !stat.isSocket()) {
    return 'Path must point to a socket';
  }

  return;
}
