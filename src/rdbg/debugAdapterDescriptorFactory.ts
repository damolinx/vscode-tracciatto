import * as vscode from 'vscode';
import * as cp from 'child_process';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { isAbsolute, join } from 'path';
import { createInterface as createReadlineInterface } from 'readline';
import { DebugType, LOCALHOST } from '../constants';
import { ExtensionContext } from '../extensionContext';
import { DEFAULT_SOCKET_TIMEOUT } from '../providers/debugConfigurationProvider';
import { AttachConfiguration } from './configurations/attachConfiguration';
import { LaunchConfiguration } from './configurations/launchConfiguration';

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
    { configuration, id, workspaceFolder }: vscode.DebugSession,
    _executable: vscode.DebugAdapterExecutable | undefined,
  ): Promise<vscode.DebugAdapterDescriptor | undefined> {
    switch (configuration.request) {
      case 'attach': {
        return this.createAttachAdapter(id, configuration as AttachConfiguration);
      }
      case 'launch': {
        const launchConfig = configuration as LaunchConfiguration;
        return launchConfig.useTerminal
          ? this.createTerminalLaunchAdapter(launchConfig, workspaceFolder)
          : this.createLaunchAdapter(launchConfig, workspaceFolder);
      }
      default:
        throw new Error(`Unsupported debug configuration type: ${configuration.request}`);
    }
  }

  private async createAttachAdapter(
    sessionId: string,
    config: AttachConfiguration,
  ): Promise<vscode.DebugAdapterDescriptor | undefined> {
    const pendingRestart = this.context.resetPendingRestart(sessionId);
    if (pendingRestart) {
      const delayMS = this.context.configuration.getReattachDelay();
      if (delayMS) {
        this.context.log.debug(`[${sessionId.slice(0, 8)}] Delay reattach by ${delayMS}ms`);
        await this.wait(delayMS);
      }
    }

    const { socket, socketTimeoutMs } = config;
    if (socket) {
      if ((await this.waitForSocket(socket, socketTimeoutMs)) === false) {
        const message = `Socket not found: ${socket}.`;
        this.context.log.error(message);
        throw new Error(message);
      }

      this.context.log.info(`Attaching via socket: ${socket}`);
      return new vscode.DebugAdapterNamedPipeServer(socket);
    }

    const { host, port } = config;
    if (port === undefined) {
      const message = 'Missing TCP port in configuration';
      this.context.log.error(message);
      vscode.window.showErrorMessage(message);
      return undefined;
    }

    this.context.log.info(`Attaching via TCP: ${[host, port].filter(Boolean).join(':')}`);
    return new vscode.DebugAdapterServer(port, host);
  }

  private async createLaunchAdapter(
    config: LaunchConfiguration,
    folder?: vscode.WorkspaceFolder,
  ): Promise<vscode.DebugAdapterDescriptor> {
    const { cwd } = config;
    const args = this.buildArgs(config);
    const cmd = config.rdbgPath || 'rdbg';
    const env = {
      ...((await this.context.rubyEnvProvider.resolveEnv(folder)) ?? process.env),
      ...config.env,
    };

    this.context.log.info(
      `Running: "${cmd} ${args.join(' ').replace(/"/g, '\\"')}"${cwd ? ` Cwd: '${cwd}'` : ''}`,
    );
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

    if (config.socket) {
      if ((await this.waitForSocket(config.socket, config.socketTimeoutMs)) === false) {
        const message = `Socket not found: ${config.socket}.`;
        this.context.log.error(message);
        throw new Error(message);
      }

      this.context.log.info(`Launched rdbg. Pid: ${child.pid} Socket: ${config.socket}`);
      return new vscode.DebugAdapterNamedPipeServer(config.socket);
    } else {
      const rdbgPort = await this.waitForRdbgPort(child);
      this.context.log.info(`Launched rdbg. Pid: ${child.pid} Endpoint: ${LOCALHOST}:${rdbgPort}`);
      return new vscode.DebugAdapterServer(rdbgPort, LOCALHOST);
    }
  }

  private async createTerminalLaunchAdapter(
    config: LaunchConfiguration,
    folder?: vscode.WorkspaceFolder,
  ): Promise<vscode.DebugAdapterDescriptor> {
    if (!config.socket) {
      config.socket = join(tmpdir(), `tracciatto-${randomUUID().substring(0, 8)}.sock`);
      delete config.host;
      delete config.port;
    }
    this.context.log.info(`Terminal debugging using socket: ${config.socket}`);

    const args = this.buildArgs(config);
    const cmd = config.rdbgPath || 'rdbg';
    this.context.log.info(
      `Terminal: "${cmd} ${args.join(' ').replace(/"/g, '\\"')}"${config.cwd ? ` Cwd: '${config.cwd}'` : ''}`,
    );

    const terminal = vscode.window.createTerminal({
      name: `Debug ${config.program}`,
      cwd: config.cwd,
      env: {
        ...(await this.context.rubyEnvProvider.resolveEnv(folder)),
        ...config.env,
      },
      isTransient: true,
      shellPath: cmd,
      shellArgs: args,
    });
    terminal.show();

    if ((await this.waitForSocket(config.socket, config.socketTimeoutMs)) === false) {
      const message = `Socket not found: ${config.socket}.`;
      this.context.log.error(message);
      terminal.dispose();
      throw new Error(message);
    }

    return new vscode.DebugAdapterNamedPipeServer(config.socket);
  }

  private buildArgs(config: LaunchConfiguration): string[] {
    const args = ['--open'];

    if (config.socket) {
      args.push('--sock-path', config.socket);
    } else {
      args.push('--port', config.port?.toString() ?? '0');
    }

    args.push('--command', ...this.resolveRuntimeExecutable(config), '--', config.program);
    if (config.args) {
      args.push(...config.args);
    }

    return args;
  }

  private resolveRuntimeExecutable({ runtimeExecutable }: vscode.DebugConfiguration): string[] {
    if (typeof runtimeExecutable !== 'string') {
      throw new Error(`Invalid "runtimeExecutable" value: ${runtimeExecutable}`);
    }

    if (isAbsolute(runtimeExecutable)) {
      return [runtimeExecutable];
    }

    const cmdWithArgs = runtimeExecutable.split(/\s+/);

    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const result = cp.spawnSync(whichCmd, [cmdWithArgs[0]], { encoding: 'utf8' });

    if (result.status === 0) {
      const firstLine = result.stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
      if (firstLine) {
        return cmdWithArgs;
      }
    }

    throw new Error(
      `Unable to resolve runtime executable "${cmdWithArgs[0]}". Set "runtimeExecutable" to a full path in your debug configuration.`,
    );
  }

  private async waitForRdbgPort(child: cp.ChildProcessWithoutNullStreams): Promise<number> {
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
      child.on('error', (error) => reject(error));
    });
    return rdbgPort;
  }

  private wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  private async waitForSocket(
    path: string,
    timeoutMs = DEFAULT_SOCKET_TIMEOUT,
    delayMs = 100,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    let exists = existsSync(path);
    while (!exists && Date.now() < deadline) {
      await this.wait(delayMs);
      exists = existsSync(path);
    }

    return exists;
  }
}
