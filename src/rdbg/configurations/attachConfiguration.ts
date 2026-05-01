import { DebugType, LOCALHOST } from '../../constants';
import { DebugConfiguration } from './debugConfiguration';

export type AttachConfiguration =
  | (DebugConfiguration & {
      host?: never;
      port?: never;
      socket: string;
      socketTimeoutMs?: number;
    })
  | (DebugConfiguration & {
      port: number;
      host: string;
      socket?: never;
      socketTimeoutMs?: never;
    });

export function createAttachConfiguration(
  portOrSocket: string,
  type: DebugType = 'tracciatto',
): AttachConfiguration {
  const baseConfig: Omit<AttachConfiguration, 'host' | 'port' | 'socket'> = {
    type,
    request: 'attach',
    name: `Attach ${portOrSocket}`,
    skipPaths: [],
  };

  const parsed = parseHostPort(portOrSocket);
  const config = parsed
    ? ({ ...baseConfig, host: parsed.host, port: parsed.port } as AttachConfiguration)
    : ({ ...baseConfig, socket: portOrSocket } as AttachConfiguration);

  return config;
}

export function parseHostPort(hostPort: string): { host: string; port: number } | undefined {
  const [hostOrPort, portOrNothing] = hostPort.split(':').map((s) => s.trim());

  if (portOrNothing) {
    const port = parseInt(portOrNothing, 10);
    return Number.isInteger(port) ? { host: hostOrPort, port } : undefined;
  }

  const port = parseInt(hostOrPort, 10);
  return Number.isInteger(port) ? { host: LOCALHOST, port } : undefined;
}
