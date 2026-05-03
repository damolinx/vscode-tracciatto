import * as vscode from 'vscode';
import { DebugType } from '../constants';
import { ExtensionContext } from '../extensionContext';
import { AttachConfiguration } from '../rdbg/configurations/attachConfiguration';
import { DebugConfiguration } from '../rdbg/configurations/debugConfiguration';
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
    let verificationMessage = await this.resolveBaseConfig(config as DebugConfiguration, folder);
    if (!verificationMessage) {
      switch (config.request) {
        case 'attach':
          config.name ??= 'Attach';
          config.socketTimeoutMs ??= DEFAULT_SOCKET_TIMEOUT;
          verificationMessage = await this.resolveAttachConfig(config, folder, token);
          verificationMessage ??= this.verifyAttachConfig(config as AttachConfiguration);
          break;

        case 'launch':
          config.cwd ??= folder?.uri.scheme === 'file' ? folder.uri.fsPath : '${fileDirname}';
          config.name ??= 'Launch';
          verificationMessage = await this.resolveLaunchConfig(config, folder, token);
          verificationMessage ??= this.verifyLaunchConfig(config as LaunchConfiguration);
          break;
      }
    }

    if (verificationMessage) {
      this.context.log.error(`${this.type}: ${verificationMessage}`);
      vscode.window.showErrorMessage(`Cannot start '${config.name}': ${verificationMessage}`);
      return;
    }

    return config;
  }

  private async resolveBaseConfig(
    config: DebugConfiguration,
    folder?: vscode.WorkspaceFolder,
  ): Promise<string | undefined> {
    try {
      config.skipPaths = await this.context.skipPathProvider.resolveSkipPaths(config, folder);
    } catch (error: any) {
      return error?.message;
    }

    return;
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
      return '"port" or "socket" must be defined';
    }
    if (config.socketTimeoutMs === undefined || config.socketTimeoutMs < 0) {
      return '"socketTimeoutMs" must be greater than or equal to 0';
    }
    return;
  }

  private verifyLaunchConfig(config: LaunchConfiguration): string | undefined {
    if (!config.program) {
      return '"program" must be defined to launch';
    }

    // Match by prefix (not full token) to cover a few more cases.
    if (['${file', '${relativeFile'].some((token) => config.program.includes(token))) {
      const editor = vscode.window.activeTextEditor?.document;
      if (!editor) {
        return 'No active Ruby editor';
      }

      if (editor.uri.scheme !== 'file') {
        return `Active editor is not a local file (scheme: ${editor.uri.scheme})`;
      }

      if (editor.languageId !== 'ruby') {
        return `Active editor is not a Ruby file (language: ${editor.languageId})`;
      }
    }
    return;
  }
}
