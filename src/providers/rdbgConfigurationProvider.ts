import * as vscode from 'vscode';
import { LOCALHOST, RDBG_TYPE } from '../constants';
import { ExtensionContext } from '../extensionContext';

export function registerRdbgConfigurationProvider(context: ExtensionContext): void {
  context.disposables.push(
    vscode.debug.registerDebugConfigurationProvider(
      RDBG_TYPE,
      new RdbgConfigurationProvider(context),
    ),
  );
}

/**
 * `rdbg` debug configuration provider. This is intended as adapter for existing
 * configurations as it unlikely users will move for a long time, if ever.
 */
export class RdbgConfigurationProvider implements vscode.DebugConfigurationProvider {
  constructor(private readonly context: ExtensionContext) {}

  resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    _token?: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    config.host = LOCALHOST;
    config.name ??= 'Debug current file (automatic)';

    config.cwd ??= folder?.uri.scheme === 'file' ? folder.uri.fsPath : '${workspaceFolder}';
    config.program ??= config.script ?? '${file}';
    config.runtimeExecutable ??= config.command ?? 'ruby';

    let verificationMessage: string | undefined;
    switch (config.request) {
      case 'attach':
        verificationMessage = this.verifyAttachConfig(config);
        break;

      case 'launch':
        verificationMessage = this.verifyLaunchConfig(config);
        break;
    }

    if (verificationMessage) {
      this.context.log.error(`Traciatto: ${verificationMessage}`);
      vscode.window.showErrorMessage(`${verificationMessage}:${config.name}`);
      return;
    }

    return config;
  }

  private verifyAttachConfig(config: vscode.DebugConfiguration): string | undefined {
    if (!config.debugPort) {
      return '"debugPort" is required for attach';
    }

    const parts = config.debugPort.split(':');
    if (parts.length > 1) {
      config.host = parts.at(0);
    }
    const parsedPort = parseInt(parts.at(-1));
    if (isNaN(parsedPort)) {
      return `"debugPort=${config.debugPort}" value format is unsupported`;
    }
    config.port = parsedPort;
    return;
  }

  private verifyLaunchConfig(config: vscode.DebugConfiguration): string | undefined {
    if (!config.program) {
      return '"program" is required for launch';
    }
    return;
  }
}
