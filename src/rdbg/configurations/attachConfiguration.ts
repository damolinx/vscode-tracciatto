import { LOCALHOST } from '../../constants';
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

export function parseHostPort(hostPort: string): { host: string; port: number } | undefined {
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
