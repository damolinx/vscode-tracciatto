import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import {
  DebugConfigurationProvider,
  registerDebugConfigurationProvider,
} from './debugConfigurationProvider';

export function registerTracciattoConfigurationProvider(context: ExtensionContext): void {
  registerDebugConfigurationProvider(context, 'tracciatto', TracciattoConfigurationProvider);
}

/**
 * `tracciatto` debug configuration provider.
 */
export class TracciattoConfigurationProvider extends DebugConfigurationProvider {
  protected override resolveAttachConfig(config: vscode.DebugConfiguration): string | undefined {
    const hasPort = !!config.port;
    const hasSocket = !!config.socket;

    if (hasPort && hasSocket) {
      return '"port" and "socket" cannot both be defined to attach';
    }

    if (!hasPort && !hasSocket) {
      return '"port" or "socket" must be defined to attach';
    }

    if (hasPort) {
      if (typeof config.port === 'string') {
        const parsed = TracciattoConfigurationProvider.parseHostPort(config.port);
        if (!parsed) {
          return '"port" has an unexpected format';
        }
        config.host = parsed.host;
        config.port = parsed.port;
      }
    }

    return;
  }

  protected override async resolveLaunchConfig(
    config: vscode.DebugConfiguration,
    folder?: vscode.WorkspaceFolder,
    _token?: vscode.CancellationToken,
  ): Promise<string | undefined> {
    config.runtimeExecutable ??= await this.resolveRuntimeExecutable(folder);
    return;
  }
}
