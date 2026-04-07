import * as vscode from 'vscode';
import { LOCALHOST, TRACIATTO_TYPE } from '../constants';
import { ExtensionContext } from '../extensionContext';

export function registerTraciattoConfigurationProvider(context: ExtensionContext): void {
  context.disposables.push(
    vscode.debug.registerDebugConfigurationProvider(
      TRACIATTO_TYPE,
      new TraciattoConfigurationProvider(context),
    ),
  );
}

/**
 * `traciatto` debug configuration provider.
 */
export class TraciattoConfigurationProvider implements vscode.DebugConfigurationProvider {
  constructor(private readonly context: ExtensionContext) {}

  resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    _token?: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    config.cwd ??= folder?.uri.scheme === 'file' ? folder.uri.fsPath : '${workspaceFolder}';
    config.name ??= 'Debug current file (automatic)';
    config.program ??= '${file}';
    config.runtimeExecutable ??= 'ruby';
    config.type ??= 'traciatto';

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
    if (!config.port) {
      return '"port" is required for attach';
    }
    config.host ??= LOCALHOST;
    return;
  }

  private verifyLaunchConfig(config: vscode.DebugConfiguration): string | undefined {
    if (!config.program) {
      return '"program" is required for launch';
    }
    return;
  }
}
