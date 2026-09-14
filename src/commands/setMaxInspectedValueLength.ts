import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { DebugSession } from '../rdbg/debugSession';

let mruValue: number | undefined;

export async function setMaxInspectedValueLength(context: ExtensionContext): Promise<void> {
  const session = vscode.debug.activeDebugSession;
  if (!session) {
    return;
  }

  const input = await vscode.window.showInputBox({
    placeHolder: 'Enter a positive integer (minimum 1)',
    prompt:
      'Maximum length of text for inspected values in this debug session, leave empty to reset to default',
    value: getMaxInspectedValueLength(context, session.workspaceFolder)?.toString(),
    validateInput: (value) => {
      const normalized = value.trim();
      if (normalized && (!/^\d+$/.test(normalized) || Number(normalized) < 1)) {
        return 'Value must be a positive integer, or empty.';
      }
      return;
    },
  });

  if (input === undefined) {
    return;
  }

  mruValue = input.trim() ? Number.parseInt(input.trim(), 10) : undefined;

  const wrapper = new DebugSession(context, session);
  await wrapper.setMaxInspectedValueLength(mruValue);
  vscode.window.setStatusBarMessage(
    `Maximum inspected value length set to ${mruValue ?? 'default'}`,
    3000,
  );
}

function getMaxInspectedValueLength(
  context: ExtensionContext,
  scope?: vscode.ConfigurationScope,
): number | undefined {
  if (mruValue !== undefined && mruValue > 0) {
    return mruValue;
  }

  const configuredValue = context.configuration.getPatchMaxInspectedValueLength(scope);
  if (configuredValue !== undefined && configuredValue > 0) {
    return configuredValue;
  }

  return;
}
