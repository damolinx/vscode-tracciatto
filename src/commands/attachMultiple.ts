import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { attach } from './attach';

export async function attachMultiple(
  context: ExtensionContext,
  ...portOrSockets: string[]
): Promise<void> {
  const targetPortOrSockets =
    portOrSockets.length > 0 ? portOrSockets : await showPortOrSocketInputBox(context);
  if (!targetPortOrSockets?.length) {
    vscode.window.showInformationMessage('No ports or sockets provided for attachment.');
    return;
  }

  await Promise.allSettled(
    targetPortOrSockets.map((portOrSocket) => attach(context, portOrSocket)),
  );
}

async function showPortOrSocketInputBox(
  { extensionContext }: ExtensionContext,
  mruKey = 'attach.mruPortOrSockets',
): Promise<string[] | undefined> {
  const mruValue = extensionContext.workspaceState.get<string>(mruKey);
  const inputValue = await vscode.window.showInputBox({
    prompt: 'Type a comma-separated list of [host:]port or socket paths',
    placeHolder: 'e.g. 1234, /tmp/socket, localhost:5678',
    value: mruValue,
  });

  const portOrSockets = inputValue
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (portOrSockets?.length) {
    extensionContext.workspaceState.update(mruKey, portOrSockets.join(', '));
    return portOrSockets;
  }

  return;
}
