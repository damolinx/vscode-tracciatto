import * as vscode from 'vscode';
import { existsSync } from 'fs';
import { isAbsolute } from 'path';
import { ExtensionContext } from '../extensionContext';
import { AttachConfiguration, parseHostPort } from '../rdbg/configurations/attachConfiguration';

export async function attach(context: ExtensionContext, portOrSocket?: string): Promise<boolean> {
  const targetPortOrSocket = portOrSocket ?? (await showPortOrSocketInputBox());
  if (!targetPortOrSocket) {
    return false;
  }

  const baseConfig: Omit<AttachConfiguration, 'host' | 'port' | 'socket'> = {
    type: 'tracciatto',
    request: 'attach',
    name: `Attach ${targetPortOrSocket}`,
    runtimeExecutable: context.configuration.getRuntimeExecutable(),
    skipPaths: [],
  };
  const parsed = parseHostPort(targetPortOrSocket);
  const config = parsed
    ? ({ ...baseConfig, host: parsed.host, port: parsed.port } as AttachConfiguration)
    : ({ ...baseConfig, socket: targetPortOrSocket } as AttachConfiguration);

  return vscode.debug.startDebugging(undefined, config);
}

let mruPortOrSocket: string | undefined;
async function showPortOrSocketInputBox(): Promise<string | undefined> {
  const value = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'Enter a host:port or a UNIX socket path',
    placeHolder: 'e.g. 127.0.0.1:12345 or /tmp/rdbg.sock',
    validateInput: validatePortOrSocket,
    value: mruPortOrSocket,
  });

  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return;
  }

  mruPortOrSocket = normalizedValue;
  return normalizedValue;
}

export function validatePortOrSocket(value: string): string | undefined {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return;
  }

  const parsed = parseHostPort(normalizedValue);
  if (parsed) {
    const { port } = parsed;
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      return 'Port must be an integer between 1024 and 65535';
    }
  } else if (isAbsolute(normalizedValue) && !existsSync(normalizedValue)) {
    return 'Socket path does not exist';
  }

  return;
}
