import * as vscode from 'vscode';
import { isAbsolute } from 'path';
import { DebugType } from '../constants';
import { ExtensionContext } from '../extensionContext';
import { AttachConfiguration } from '../rdbg/configurations/attachConfiguration';
import { LaunchConfiguration } from '../rdbg/configurations/launchConfiguration';

export const DEFAULT_SOCKET_TIMEOUT = 5000;

/**
 * Base debug configuration provider.
 */
export abstract class DebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  constructor(
    protected readonly context: ExtensionContext,
    public readonly type: DebugType,
  ) {}

  async resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    token?: vscode.CancellationToken,
  ): Promise<vscode.DebugConfiguration | undefined> {
    config.skipPaths = await this.getMergedSkipPaths(config, folder);

    let verificationMessage: string | undefined;
    switch (config.request) {
      case 'attach':
        config.name ??= 'Attach to rdbg';
        config.socketTimeoutMs ??= DEFAULT_SOCKET_TIMEOUT;
        verificationMessage = await this.resolveAttachConfig(config, folder, token);
        verificationMessage ??= this.verifyAttachConfig(config as AttachConfiguration);
        break;

      case 'launch':
        config.cwd ??= folder?.uri.scheme === 'file' ? folder.uri.fsPath : '${fileDirname}';
        config.name ??= 'Launch with rdbg';
        verificationMessage = await this.resolveLaunchConfig(config, folder, token);
        verificationMessage ??= this.verifyLaunchConfig(config as LaunchConfiguration);
        break;
    }

    if (verificationMessage) {
      this.context.log.error(`${this.type}: ${verificationMessage}`);
      vscode.window.showErrorMessage(`${config.name}: ${verificationMessage}`);
      return;
    }

    return config;
  }

  private async getMergedSkipPaths(
    config: vscode.DebugConfiguration,
    folder?: vscode.WorkspaceFolder,
  ): Promise<string[]> {
    const skipPaths: string[] = Array.isArray(config.skipPaths) ? config.skipPaths : [];
    const mergedSkipPaths = new Set(
      [
        ...this.context.configuration.getSkipPaths(folder),
        ...(await this.readSkipPathsFile(folder)),
        ...skipPaths,
      ]
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean),
    );

    return Array.from(mergedSkipPaths);
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

  protected abstract resolveAttachConfig(
    config: vscode.DebugConfiguration,
    folder?: vscode.WorkspaceFolder,
    token?: vscode.CancellationToken,
  ): Promise<string | undefined> | string | undefined;

  protected abstract resolveLaunchConfig(
    config: vscode.DebugConfiguration,
    folder?: vscode.WorkspaceFolder,
    token?: vscode.CancellationToken,
  ): Promise<string | undefined> | string | undefined;

  protected async resolveRuntimeExecutable(folder?: vscode.WorkspaceFolder): Promise<string> {
    return this.context.configuration.getPreferBundler(folder) &&
      (!folder ||
        (await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder.uri, 'Gemfile')).then(
          ({ type }) => Boolean(type & vscode.FileType.File),
          () => false,
        )))
      ? 'bundle exec ruby'
      : this.context.configuration.getRuntimeExecutable(folder);
  }

  private verifyAttachConfig(config: AttachConfiguration): string | undefined {
    if (!config.socket && config.port === undefined) {
      return '"port" or "socket" must be defined to attach';
    }
    if (config.socketTimeoutMs === undefined || config.socketTimeoutMs < 0) {
      return '"socketTimeoutMs" must be greater than or equal to 0';
    }
    return;
  }

  private verifyLaunchConfig(config: LaunchConfiguration): string | undefined {
    if (!config.program) {
      return '"program" is required to launch';
    }
    return;
  }
}
