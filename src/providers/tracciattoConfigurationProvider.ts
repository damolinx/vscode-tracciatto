import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { parseHostPort } from '../rdbg/configurations/attachConfiguration';
import { DebugConfigurationProvider } from './debugConfigurationProvider';

export function registerTracciattoConfigurationProvider(context: ExtensionContext): void {
  const provider = new TracciattoConfigurationProvider(context);
  context.disposables.push(
    vscode.debug.registerDebugConfigurationProvider(provider.type, provider),
  );
}

/**
 * `tracciatto` debug configuration provider.
 */
export class TracciattoConfigurationProvider extends DebugConfigurationProvider {
  constructor(context: ExtensionContext) {
    super(context, 'tracciatto');
  }

  protected override resolveAttachConfig(config: vscode.DebugConfiguration): string | undefined {
    return this.resolvePortOrSocket(config, true);
  }

  protected override async resolveLaunchConfig(
    config: vscode.DebugConfiguration,
    folder?: vscode.WorkspaceFolder,
    _token?: vscode.CancellationToken,
  ): Promise<string | undefined> {
    const validation = this.resolvePortOrSocket(config, false);
    if (validation) {
      return validation;
    }

    config.runtimeExecutable ??= await this.resolveRuntimeExecutable(folder);
    return;
  }

  protected resolvePortOrSocket(
    config: vscode.DebugConfiguration,
    required: boolean,
  ): string | undefined {
    const hasPort = !!config.port;
    const hasSocket = !!config.socket;

    if (hasPort && hasSocket) {
      return '"port" and "socket" cannot both be defined';
    }

    if (!hasPort && !hasSocket) {
      return required ? '"port" or "socket" must be defined' : undefined;
    }

    if (hasPort) {
      if (typeof config.port === 'string') {
        const parsed = parseHostPort(config.port);
        if (!parsed) {
          return '"port" has an unexpected format';
        }
        config.host = parsed.host;
        config.port = parsed.port;
      }
      return;
    }

    return;
  }
}
