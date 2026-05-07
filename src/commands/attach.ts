import * as vscode from 'vscode';
import { spawn } from 'child_process';
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
  return new Promise<string | undefined>((resolve) => {
    const quickPick = vscode.window.createQuickPick();
    quickPick.ignoreFocusOut = true;
    quickPick.matchOnDescription = false;
    quickPick.matchOnDetail = false;
    quickPick.placeholder = 'Type a [host:]port or a socket path';

    let socketItems: vscode.QuickPickItem[] = [];
    quickPick.onDidAccept(() => {
      const selectedItem = quickPick.selectedItems[0];
      if (selectedItem && !selectedItem.detail) {
        extensionContext.workspaceState.update(mruKey, selectedItem.label);
        quickPick.hide();
        resolve(selectedItem.label);
      }
    });

    quickPick.onDidChangeValue((value) => {
      const hasUserInputItem = quickPick.items.length && 'userInput' in quickPick.items[0];

      const normalizedValue = value.trim();
      if (!normalizedValue) {
        if (hasUserInputItem) {
          quickPick.items = quickPick.items.slice(1);
        }
        return;
      }

      const matchItem = quickPick.items.find(
        (item, index) => (!hasUserInputItem || index > 0) && item.label === normalizedValue,
      );
      if (matchItem) {
        if (hasUserInputItem) {
          quickPick.items = quickPick.items.slice(1);
        }
        return;
      }

      const validationMessage = validatePortOrSocket(normalizedValue);
      const baseItems = hasUserInputItem ? quickPick.items.slice(1) : quickPick.items;
      quickPick.items = [
        {
          label: normalizedValue,
          description: 'current input',
          detail: validationMessage ? `$(error) ${validationMessage}` : undefined,
          userInput: true,
        } as vscode.QuickPickItem & { userInput: true },
        ...baseItems,
      ];
    });

    (async () => {
      quickPick.busy = true;
      const sockets = await findRdbgSockets();
      if (sockets.length) {
        socketItems = sockets.map((sock) => ({
          alwaysShow: true,
          description: 'autodetected',
          label: sock,
        }));
        quickPick.placeholder = 'Type a [host:]port or a socket path, or select one from dropdown';
        quickPick.items = [...quickPick.items, ...socketItems];
      }
      quickPick.busy = false;
    })();

    quickPick.value = extensionContext.workspaceState.get(mruKey, '');
    quickPick.show();
  });
}

function findRdbgSockets(): Promise<string[]> {
  return new Promise((resolve) => {
    const child = spawn('rdbg', ['--util=list-socks'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.on('close', () => {
      const sockets = output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      resolve(sockets.sort());
    });
    child.on('error', () => resolve([]));
  });
}

export function validatePortOrSocket(value: string): string | undefined {
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
