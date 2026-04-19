import * as vscode from 'vscode';
import * as cp from 'child_process';
import { existsSync } from 'fs';
import { isAbsolute } from 'path';
import { createInterface as createReadlineInterface } from 'readline';
import { DebugType, LOCALHOST } from '../constants';
import { ExtensionContext } from '../extensionContext';
import { AttachRdbgConfiguration, LaunchRdbgConfiguration } from './debugConfiguration';

export function registerDebugAdapterDescriptorFactory(
  context: ExtensionContext,
  type: DebugType,
): void {
  context.disposables.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      type,
      new DebugAdapterDescriptorFactory(context),
    ),
  );
}

export class DebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
  constructor(private readonly context: ExtensionContext) {}

  async createDebugAdapterDescriptor(
    { configuration }: vscode.DebugSession,
    _executable: vscode.DebugAdapterExecutable | undefined,
  ): Promise<vscode.DebugAdapterDescriptor | undefined> {
    switch (configuration.request) {
      case 'attach': {
        return this.createAttachAdapter(configuration as AttachRdbgConfiguration);
      }
      case 'launch': {
        return this.createLaunchAdapter(configuration as LaunchRdbgConfiguration);
      }
      default:
        throw new Error(`Unsupported debug configuration type: ${configuration.request}`);
    }
  }

  private async createAttachAdapter(
    config: AttachRdbgConfiguration,
  ): Promise<vscode.DebugAdapterDescriptor | undefined> {
    const { socket } = config;
    if (socket) {
      if (!existsSync(socket)) {
        const msg = `Socket not found: ${socket}.`;
        this.context.log.error(msg);
        throw new Error(msg);
      }

      this.context.log.info(`Attaching via socket: ${config.socket}`);
      return new vscode.DebugAdapterNamedPipeServer(config.socket);
    }

    const { host, port } = config;
    if (port === undefined) {
      const msg = 'Missing TCP port in configuration';
      this.context.log.error(msg);
      vscode.window.showErrorMessage(msg);
      return undefined;
    }

    this.context.log.info(`Attaching via TCP: ${[host, port].join(':')}`);
    return new vscode.DebugAdapterServer(port, host);
  }

  private async createLaunchAdapter(
    config: LaunchRdbgConfiguration,
  ): Promise<vscode.DebugAdapterDescriptor> {
    const args = this.buildArgs(config);
    const { cwd, rdbgPath } = config;
    const cmd = rdbgPath || 'rdbg';
    const env = { ...process.env, ...config.env };
    this.context.log.info(`Running: '${cmd} ${args.join(' ')}'${cwd ? ` Cwd: '${cwd}'` : ''}`);

    const child = cp.spawn(cmd, args, { cwd, env, shell: false });
    child
      .on('error', (err) => {
        this.context.log.error(`Failed to spawn rdbg: ${err.message}`);
      })
      .on('exit', (code, signal) => {
        if (code === 0) {
          this.context.log.info('rdbg exited (0)');
        } else {
          this.context.log.error(`rdbg exited (${code}${signal !== null ? `, ${signal}` : ''})`);
        }
      });
    child.stderr.on('data', (chunk) => this.context.log.info(`>> ${chunk.toString().trim()}`));
    child.stdout.on('data', (chunk) => this.context.log.info(`> ${chunk}`));
    const rdbgPort = await this.waitForRdbgPort(child);
    this.context.log.info(`Launched rdbg. Pid: ${child.pid} Endpoint: ${LOCALHOST}:${rdbgPort}`);

    return new vscode.DebugAdapterServer(rdbgPort, LOCALHOST);
  }

  private buildArgs(config: LaunchRdbgConfiguration): string[] {
    const { args = [], port, program } = config;
    const mergedArgs = ['--open', '--port', (port ?? 0).toString()];

    const resolvedRuntimeExecutable = this.resolveRuntimeExecutable(config);
    mergedArgs.push('--command', ...resolvedRuntimeExecutable, '--', program, ...args);
    return mergedArgs;
  }

  private resolveRuntimeExecutable(config: vscode.DebugConfiguration): string[] {
    const candidate = config.runtimeExecutable;
    if (typeof candidate !== 'string' || !candidate) {
      throw new Error(`Invalid "runtimeExecutable" value: ${candidate}`);
    }

    if (isAbsolute(candidate)) {
      return [candidate];
    }

    const candidateWithArgs = candidate.split(/\s+/);

    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const result = cp.spawnSync(whichCmd, [candidateWithArgs[0]], { encoding: 'utf8' });

    if (result.status === 0) {
      const firstLine = result.stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
      if (firstLine) {
        return candidateWithArgs;
      }
    }

    throw new Error(
      `Unable to resolve runtime executable "${candidateWithArgs[0]}". Set "runtimeExecutable" to a full path in your debug configuration.`,
    );
  }

  private async waitForRdbgPort(child: cp.ChildProcessWithoutNullStreams) {
    const readline = createReadlineInterface({ input: child.stderr });
    const rdbgPort = await new Promise<number>((resolve, reject) => {
      let firstLine: string | undefined;
      readline.on('line', (line) => {
        firstLine ??= line.trim();
        const match = line.match(/:(\d+)\)$/);
        if (match) {
          resolve(Number(match[1]));
          readline.removeAllListeners();
          child.stderr.removeAllListeners();
        }
      });
      child.on('exit', (code) => {
        let error = `rdbg exited with code ${code}`;
        if (firstLine) {
          error += `\n${firstLine}`;
        }
        reject(new Error(error));
      });
    });
    return rdbgPort;
  }
}
