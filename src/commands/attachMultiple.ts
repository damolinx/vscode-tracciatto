import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { attach, validatePortOrSocket } from './attach';

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
  return new Promise<string[] | undefined>((resolve) => {
    const input = vscode.window.createInputBox();
    input.ignoreFocusOut = true;
    input.prompt = 'Type a comma-separated list of [host:]port or socket paths';
    input.placeholder = 'e.g. 1234, /tmp/socket, localhost:5678';

    input.onDidAccept(() => {
      if (input.validationMessage) {
        return;
      }

      const portOrSockets = input.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (portOrSockets?.length) {
        extensionContext.workspaceState.update(mruKey, portOrSockets.join(', '));
        input.hide();
        resolve(portOrSockets);
      }
    });

    input.onDidChangeValue((value) => {
      input.validationMessage = validateListOfPortsOrSockets(value);
    });

    input.value = extensionContext.workspaceState.get(mruKey, '');
    input.validationMessage = validateListOfPortsOrSockets(input.value);
    input.show();
  });
}

function validateListOfPortsOrSockets(value: string): string | undefined {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return;
  }

  return normalizedValue
    .split(',')
    .map((value) => [value, validatePortOrSocket(value.trim())])
    .filter(([value, validation]) => value && validation)
    .map(([value, validation]) => `${validation} (${value!.trim()})`)
    .join(', ');
}
