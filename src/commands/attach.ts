import * as vscode from 'vscode';
import { spawn, SpawnOptionsWithStdioTuple, StdioNull, StdioPipe } from 'child_process';
import { lstatSync } from 'fs';
import { isAbsolute } from 'path';
import { ExtensionContext } from '../extensionContext';
import {
  createAttachConfiguration,
  parseHostPort,
} from '../rdbg/configurations/attachConfiguration';
import { shouldRunWithBundler } from '../utils/bundler';
import { NaturalComparer } from '../utils/comparer';

interface SocketQuickPickItem extends vscode.QuickPickItem {
  error?: boolean;
  userInput?: boolean;
}

export async function attach(context: ExtensionContext, portOrSocket?: string): Promise<boolean> {
  const folders = vscode.workspace.workspaceFolders;
  const folder = folders?.length === 1 ? folders[0] : undefined;

  const targetPortOrSocket = portOrSocket ?? (await showPortOrSocketInputBox(context, folder));
  if (!targetPortOrSocket) {
    return false;
  }

  const config = createAttachConfiguration(targetPortOrSocket);
  return vscode.debug.startDebugging(folder, config);
}

async function showPortOrSocketInputBox(
  context: ExtensionContext,
  folder?: vscode.WorkspaceFolder,
  mruKey = 'attach.mruPortOrSocket',
): Promise<string | undefined> {
  const workspaceState = context.extensionContext.workspaceState;
  return new Promise<string | undefined>((resolve) => {
    const quickPick = vscode.window.createQuickPick<SocketQuickPickItem>();
    quickPick.ignoreFocusOut = true;
    quickPick.matchOnDescription = false;
    quickPick.matchOnDetail = false;
    quickPick.placeholder = 'Type a [host:]port or a socket path';

    let result: string | undefined;
    quickPick.onDidAccept(() => {
      const selectedItem = quickPick.selectedItems[0];
      if (selectedItem && !selectedItem.error) {
        result = selectedItem.label;
        workspaceState.update(mruKey, result);
        quickPick.hide();
      }
    });
    quickPick.onDidHide(() => resolve(result));
    quickPick.onDidChangeValue((value) => {
      const hasUserInputItem = quickPick.items[0]?.userInput === true;
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
          error: !!validationMessage,
          userInput: true,
        },
        ...baseItems,
      ];
    });

    (async () => {
      quickPick.busy = true;
      try {
        const sockets = await findRdbgSockets(context, folder);
        if (sockets.length) {
          const existingLabels = new Set(quickPick.items.map((item) => item.label));
          quickPick.placeholder =
            'Type a [host:]port or a socket path, or pick one from the dropdown';
          quickPick.items = [
            ...quickPick.items,
            ...sockets
              .filter((sock) => !existingLabels.has(sock))
              .map((sock) => ({
                alwaysShow: true,
                description: 'autodetected',
                label: sock,
              })),
          ];
        }
      } catch {
        quickPick.items = [
          ...quickPick.items,
          {
            alwaysShow: true,
            label:
              '$(error) An error occurred while searching for sockets. Enter port or socket path manually',
            error: true,
          },
        ];
        context.log.show(true);
      } finally {
        quickPick.busy = false;
      }
    })();

    quickPick.value = workspaceState.get(mruKey, '');
    quickPick.show();
  });
}

async function findRdbgSockets(
  context: ExtensionContext,
  folder?: vscode.WorkspaceFolder,
): Promise<string[]> {
  const useBundler = folder && (await shouldRunWithBundler(context, folder));
  return new Promise((resolve, reject) => {
    const options: SpawnOptionsWithStdioTuple<StdioNull, StdioPipe, StdioPipe> = {
      cwd: context.configuration.getSocketSearchRoot(folder, folder?.uri.fsPath),
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    };

    const child = useBundler
      ? spawn('bundle', ['exec', 'rdbg', '--util=list-socks'], options)
      : spawn('rdbg', ['--util=list-socks'], options);
    context.log.debug(
      `Searching for sockets using '${child.spawnargs.join(' ')}'. Cwd: ${options.cwd ?? process.cwd()}`,
    );

    let output = '';
    let errorOutput = '';

    child.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.on('close', (code, signal) => {
      if (code || signal) {
        const error = errorOutput.replace(/\n\s+from .+/g, '').trim();
        context.log.error(
          `Socket search failed (${code ? `exitCode: ${code}` : signal ? `signal: ${signal}` : ''}). Error: ${error}`,
        );
        reject(new Error('Socket search failed'));
        return;
      }
      const sockets = output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      resolve(sockets.sort(NaturalComparer.compare));
    });

    child.on('error', (error) => {
      context.log.error(`Socket search failed. Error: ${error}`);
      reject(new Error('Socket search failed'));
    });
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
