import * as vscode from 'vscode';
import { isAbsolute } from 'path';
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

  async resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    configuration: vscode.DebugConfiguration,
    _token?: vscode.CancellationToken,
  ): Promise<vscode.DebugConfiguration | undefined> {
    configuration.cwd ??= folder?.uri.scheme === 'file' ? folder.uri.fsPath : '${workspaceFolder}';
    configuration.name ??= 'Debug current file';
    configuration.runtimeExecutable ??= this.context.configuration.getRuntimeExecutable(folder);
    configuration.skipPaths = [
      ...new Set([
        ...this.context.configuration.getSkipPaths(folder),
        ...(await this.readSkipPathsFile(folder)),
        ...(Array.isArray(configuration.skipPaths) ? configuration.skipPaths : []),
      ]),
    ];

    let verificationMessage: string | undefined;
    switch (configuration.request) {
      case 'attach':
        verificationMessage = this.verifyAttachConfig(configuration);
        break;

      case 'launch':
        configuration.program ??= '${file}';
        verificationMessage = this.verifyLaunchConfig(configuration);
        break;
    }

    if (verificationMessage) {
      this.context.log.error(`${this.type}: ${verificationMessage}`);
      vscode.window.showErrorMessage(`${verificationMessage}:${configuration.name}`);
      return;
    }

    return configuration;
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

  private async readSkipPathsFile(workspaceFolder?: vscode.WorkspaceFolder): Promise<string[]> {
    const candidate = this.context.configuration.getSkipPathsFileName(workspaceFolder);
    const skipPathsFileUri =
      isAbsolute(candidate) || !workspaceFolder
        ? vscode.Uri.file(candidate)
        : vscode.Uri.joinPath(workspaceFolder.uri, candidate);

    const exists = await vscode.workspace.fs.stat(skipPathsFileUri).then(
      (stat) => Boolean(stat.type & vscode.FileType.File),
      () => false,
    );
    this.context.log.debug(
      `Resolved skipPathFile. Path: '${vscode.workspace.asRelativePath(skipPathsFileUri)}' Exists: ${exists}`,
    );

    if (exists) {
      const data = await vscode.workspace.fs.readFile(skipPathsFileUri);
      return data
        .toString()
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
    }

    return [];
  }
}
