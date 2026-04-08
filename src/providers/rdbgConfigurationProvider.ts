import * as vscode from 'vscode';
import { RDBG_TYPE } from '../constants';
import { ExtensionContext } from '../extensionContext';
import { DebugConfigurationProvider } from './debugConfigurationProvider';

export function registerRdbgConfigurationProvider(context: ExtensionContext): void {
  context.disposables.push(
    vscode.debug.registerDebugConfigurationProvider(
      RDBG_TYPE,
      new RdbgConfigurationProvider(context, RDBG_TYPE),
    ),
  );
}

/**
 * `rdbg` debug configuration provider. This is intended as adapter for existing
 * configurations as it unlikely users will move for a long time, if ever.
 */
export class RdbgConfigurationProvider extends DebugConfigurationProvider {
  override resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    token?: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    config.program ??= config.script;
    config.runtimeExecutable ??= config.command;
    return super.resolveDebugConfiguration(folder, config, token);
  }

  protected override verifyAttachConfig(config: vscode.DebugConfiguration): string | undefined {
    if (!config.debugPort) {
      return '"debugPort" is required for attach';
    }

    const parsed = this.parseHostPort(config.debugPort);
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
}
