import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { parseHostPort } from '../rdbg/configurations/attachConfiguration';
import { DebugConfigurationProvider } from './debugConfigurationProvider';

export function registerRdbgConfigurationProvider(context: ExtensionContext): void {
  const provider = new RdbgConfigurationProvider(context);
  context.disposables.push(
    vscode.debug.registerDebugConfigurationProvider(provider.type, provider),
  );
}

/**
 * `rdbg` debug configuration provider. This is intended as adapter for existing
 * configurations as it unlikely users will move for a long time, if ever, to
 * `tracciatto`.
 */
export class RdbgConfigurationProvider extends DebugConfigurationProvider {
  constructor(context: ExtensionContext) {
    super(context, 'rdbg');
  }

  protected override resolveAttachConfig(config: vscode.DebugConfiguration): string | undefined {
    if (!config.debugPort) {
      return '"debugPort" must be defined to attach';
    }

    const parsed = parseHostPort(config.debugPort);
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
    config.runtimeExecutable =
      config.command?.trim() || (await this.resolveRuntimeExecutable(folder));
    return;
  }
}
