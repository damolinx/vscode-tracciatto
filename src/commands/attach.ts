import * as vscode from 'vscode';
import { DebugType } from '../constants';
import { ExtensionContext } from '../extensionContext';
import { TracciattoConfigurationProvider } from '../providers/tracciattoConfigurationProvider';
import { AttachRdbgConfiguration } from '../rdbg/debugConfiguration';

export async function attach(context: ExtensionContext, portOrSocket?: string): Promise<boolean> {
  const targetPortOrSocket = portOrSocket ?? (await showPortOrSocketInputBox());
  if (!targetPortOrSocket) {
    return false;
  }

  const baseConfig = {
    type: 'tracciatto' as DebugType,
    request: 'attach',
    name: `Attach ${targetPortOrSocket}`,
    runtimeExecutable: context.configuration.getRuntimeExecutable(),
    skipPaths: [],
  };
  const parsed = TracciattoConfigurationProvider.parseHostPort(targetPortOrSocket);
  const config: AttachRdbgConfiguration = parsed
    ? { ...baseConfig, host: parsed.host, port: parsed.port }
    : { ...baseConfig, socket: targetPortOrSocket };
  return vscode.debug.startDebugging(undefined, config);
}

async function showPortOrSocketInputBox(): Promise<string | undefined> {
  const value = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'Enter a host:port or a UNIX socket path',
    placeHolder: 'e.g. 127.0.0.1:12345 or /tmp/rdbg.sock',
    validateInput: validatePortOrSocket,
  });
  return value?.trim();
}

export function validatePortOrSocket(input: string): string | undefined {
  const normalizedValue = input.trim();
  if (!normalizedValue) {
    return 'Value cannot be empty';
  }

  const parsed = TracciattoConfigurationProvider.parseHostPort(normalizedValue);
  if (parsed) {
    const { port } = parsed;
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return 'Port must be an integer between 1 and 65535';
    }
  }

  return;
}
