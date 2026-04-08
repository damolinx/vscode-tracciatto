import * as vscode from 'vscode';
import { LOCALHOST } from '../constants';
import { ExtensionContext } from '../extensionContext';

/**
 * Base debug configuration provider.
 */
export abstract class DebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  constructor(
    protected readonly context: ExtensionContext,
    protected readonly type: string,
  ) { }

  resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    _token?: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    config.cwd ??= folder?.uri.scheme === 'file' ? folder.uri.fsPath : '${workspaceFolder}';
    config.program ??= '${file}';
    config.name ??= 'Debug current file';
    config.runtimeExecutable ??= this.context.configuration.getRuntimeExecutable(folder);

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
      this.context.log.error(`${this.type}: ${verificationMessage}`);
      vscode.window.showErrorMessage(`${verificationMessage}:${config.name}`);
      return;
    }

    return config;
  }

  protected abstract verifyAttachConfig(config: vscode.DebugConfiguration): string | undefined;

  protected verifyLaunchConfig(config: vscode.DebugConfiguration): string | undefined {
    if (!config.program) {
      return '"program" is required for launch';
    }
    return;
  }

  protected parseHostPort(hostPort: string): { host: string; port: number } | undefined {
    let host: string | undefined;
    let port = NaN;

    const [hostOrPort, portOrNothing] = hostPort.split(':').map((s) => s.trim());
    if (portOrNothing) {
      host = hostOrPort;
      port = parseInt(portOrNothing);
    } else {
      host = LOCALHOST;
      port = parseInt(hostOrPort);
    }

    return isNaN(port) ? undefined : { host, port };
  }
}
