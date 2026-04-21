import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import {
  DebugConfigurationProvider,
  registerDebugConfigurationProvider,
} from './debugConfigurationProvider';

export function registerRdbgConfigurationProvider(context: ExtensionContext): void {
  registerDebugConfigurationProvider(context, 'rdbg', RdbgConfigurationProvider);
}

/**
 * `rdbg` debug configuration provider. This is intended as adapter for existing
 * configurations as it unlikely users will move for a long time, if ever, to
 * `tracciatto`.
 */
export class RdbgConfigurationProvider extends DebugConfigurationProvider {
  protected override resolveAttachConfig(config: vscode.DebugConfiguration): string | undefined {
    if (!config.debugPort) {
      return '"debugPort" must be defined to attach';
    }

    const parsed = RdbgConfigurationProvider.parseHostPort(config.debugPort);
    if (parsed) {
      config.host = parsed.host;
      config.port = parsed.port;
      config.socket = undefined;
    } else {
      config.socket = config.debugPort;
      config.host = undefined;
      config.port = undefined;
    }

    return;
  }

  protected override async resolveLaunchConfig(
    config: vscode.DebugConfiguration,
    folder?: vscode.WorkspaceFolder,
    _token?: vscode.CancellationToken,
  ): Promise<string | undefined> {
    if (!config.script) {
      return '"script" must be defined to launch';
    }
    config.program ??= config.script;

    const normalizedCommand = config.command?.trim();
    config.runtimeExecutable = normalizedCommand
      ? normalizedCommand
      : await this.resolveRuntimeExecutable(folder);
    return;
  }
}
