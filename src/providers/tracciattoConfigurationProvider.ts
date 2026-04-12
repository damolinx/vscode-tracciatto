import * as vscode from 'vscode';
import { TRACCIATTO_TYPE } from '../constants';
import { ExtensionContext } from '../extensionContext';
import { DebugConfigurationProvider } from './debugConfigurationProvider';

export function registerTracciattoConfigurationProvider(context: ExtensionContext): void {
  context.disposables.push(
    vscode.debug.registerDebugConfigurationProvider(
      TRACCIATTO_TYPE,
      new TracciattoConfigurationProvider(context, TRACCIATTO_TYPE),
    ),
  );
}

/**
 * `tracciatto` debug configuration provider.
 */
export class TracciattoConfigurationProvider extends DebugConfigurationProvider {
  protected override verifyAttachConfig(config: vscode.DebugConfiguration): string | undefined {
    const hasPort = !!config.port;
    const hasSocket = !!config.socket;

    if (hasPort && hasSocket) {
      return '"port" and "socket" cannot both be defined to attach';
    }

    if (!hasPort && !hasSocket) {
      return '"port" or "socket" must be defined to attach';
    }

    if (hasPort) {
      const parsed = this.parseHostPort(config.port);
      if (!parsed) {
        return '"port" has an unexpected format';
      }
      config.host = parsed.host;
      config.port = parsed.port;
    }

    return;
  }
}
