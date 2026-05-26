import * as vscode from 'vscode';
import { DEFAULT_MAX_INSPECTED_LENGTH } from '../constants';
import { ExtensionContext } from '../extensionContext';
import { DebugSession } from '../rdbg/debugSession';

let mruValue: number | undefined;

export async function setMaxInspectedValueLength(context: ExtensionContext): Promise<void> {
  const session = vscode.debug.activeDebugSession;
  if (!session) {
    return;
  }

  const current =
    mruValue ??
    context.configuration.getPatchMaxInspectedValueLength(
      session.workspaceFolder,
      DEFAULT_MAX_INSPECTED_LENGTH,
    );

  const input = await vscode.window.showInputBox({
    placeHolder: 'Enter a positive integer (minimum 1)',
    prompt:
      'Maximum length of the string representation shown for inspected values in this debug session.',
    value: String(current),
    validateInput: (value) => {
      const normalized = value.trim();
      if (!/^\d+$/.test(normalized) || Number(normalized) < 1) {
        return 'Value must be a positive integer greater than 1.';
      }
      return;
    },
  });
  if (!input) {
    return;
  }

  const parsedInput = Number.parseInt(input, 10);
  mruValue = parsedInput;

  const wrapper = new DebugSession(context, session);
  await wrapper.setMaxInspectedValueLength(parsedInput);

  vscode.window.setStatusBarMessage(`Maximum inspected value length set to ${parsedInput}`, 3000);
}
