import * as vscode from 'vscode';
import * as cp from 'child_process';
import { join, isAbsolute } from 'path';
import * as readline from 'readline';
import { LOCALHOST } from '../constants';
import { ExtensionContext } from '../extensionContext';

export function registerRdbgDebugAdapterFactory(context: ExtensionContext, type: string): void {
  context.disposables.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(type, new RdbgDebugAdapterFactory(context)),
  );
}

export class RdbgDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
  constructor(private readonly context: ExtensionContext) {}

  async createDebugAdapterDescriptor(
    session: vscode.DebugSession,
    _executable: vscode.DebugAdapterExecutable | undefined,
  ): Promise<vscode.DebugAdapterDescriptor | undefined> {
    const { configuration } = session;
    switch (configuration.request) {
      case 'attach':
        return this.createAttachAdapter(configuration);
      case 'launch':
        return this.createLaunchAdapter(configuration);
      default:
        throw new Error(`Unsupported debug configuration type: ${configuration.request}`);
    }
  }

  private async createAttachAdapter(
    config: vscode.DebugConfiguration,
  ): Promise<vscode.DebugAdapterDescriptor> {
    if (config.socket) {
      this.context.log.info(`Attaching via socket: ${config.socket}`);
      return new vscode.DebugAdapterNamedPipeServer(config.socket);
    }

    const { host, port } = config;
    this.context.log.info(`Attaching via TCP: ${host}:${port}`);
    return new vscode.DebugAdapterServer(port, host);
  }

  private async createLaunchAdapter(
    config: vscode.DebugConfiguration,
  ): Promise<vscode.DebugAdapterDescriptor> {
    const args = this.buildArgs(config);
    const { cwd, rdbgPath } = config;
    const cmd = rdbgPath ? join(rdbgPath, 'rdbg') : 'rdbg';
    const env = { ...process.env, ...config.env };

    const child = cp.spawn(cmd, args, { cwd, env, shell: false });
    this.context.log.info(
      `Running: '${cmd} ${args.join(' ')}'${cwd ? ` Cwd: '${cwd}'` : ''} pid: ${child.pid}`,
    );

    const rdbgPort = await this.waitForRdbgPort(child);
    this.context.log.info(`Launched rdbg at ${LOCALHOST}:${rdbgPort}`);

    return new vscode.DebugAdapterServer(rdbgPort, LOCALHOST);
  }

  private buildArgs(config: vscode.DebugConfiguration): string[] {
    const { args = [], port, program } = config;
    const mergedArgs = ['--open', '--port', (port ?? 0).toString()];
    const resolvedRuntimeExecutable = this.resolveRuntimeExecutable(config);
    mergedArgs.push('--command', resolvedRuntimeExecutable, '--', program, ...args);
    return mergedArgs;
  }

  private resolveRuntimeExecutable(config: vscode.DebugConfiguration): string {
    const candidate = config.runtimeExecutable;
    if (isAbsolute(candidate)) {
      return candidate;
    }

    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const result = cp.spawnSync(whichCmd, [candidate], { encoding: 'utf8' });

    if (result.status === 0) {
      const firstLine = result.stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
      if (firstLine) {
        return firstLine.trim();
      }
    }

    throw new Error(
      `Unable to resolve runtime executable "${candidate}". Set "runtimeExecutable" to a full path in your debug configuration.`,
    );
  }

  private async waitForRdbgPort(child: cp.ChildProcessWithoutNullStreams) {
    const rl = readline.createInterface({ input: child.stderr });
    const rdbgPort = await new Promise<number>((resolve, reject) => {
      rl.on('line', (line) => {
        const match = line.match(/:(\d+)\)$/);
        if (match) {
          resolve(Number(match[1]));
          rl.removeAllListeners();
          child.stderr.removeAllListeners();
        }
      });
      child.on('exit', (code) => reject(new Error(`rdbg exited with code ${code}`)));
    });
    return rdbgPort;
  }
}
