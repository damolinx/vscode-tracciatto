import * as vscode from 'vscode';
import * as cp from 'child_process';
import { existsSync } from 'fs';
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
    switch (session.configuration.request) {
      case 'attach': {
        return this.createAttachAdapter(session.configuration);
      }
      case 'launch': {
        const configuration = await this.normalizeConfig(session);
        return this.createLaunchAdapter(configuration);
      }
      default:
        throw new Error(`Unsupported debug configuration type: ${session.configuration.request}`);
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
    if (config.skipPaths?.length) {
      env.RUBY_DEBUG_SKIP_PATH = config.skipPaths.join(';');
    }

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

  private async normalizeConfig({
    configuration,
    workspaceFolder,
  }: vscode.DebugSession): Promise<vscode.DebugConfiguration> {
    const skipPathsFromSettings = this.context.configuration.getSkipPaths(workspaceFolder);
    const skipPathsFromFile = await this.readSkipPathsFile(workspaceFolder);
    const skipPathsFromConfig = Array.isArray(configuration.skipPaths)
      ? configuration.skipPaths
      : [];
    const mergedSkipPaths = [
      ...new Set([...skipPathsFromSettings, ...skipPathsFromFile, ...skipPathsFromConfig]),
    ];
    return {
      ...configuration,
      skipPaths: mergedSkipPaths,
    };
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

  private async readSkipPathsFile(workspaceFolder?: vscode.WorkspaceFolder): Promise<string[]> {
    const candidate = this.context.configuration.getSkipPathsFileName(workspaceFolder);
    const skipPathsFileUri =
      isAbsolute(candidate) || !workspaceFolder
        ? vscode.Uri.file(candidate)
        : vscode.Uri.joinPath(workspaceFolder.uri, candidate);

    const exists = existsSync(skipPathsFileUri.fsPath);
    this.context.log.debug(
      `Resolved skipPathFile Path: '${vscode.workspace.asRelativePath(skipPathsFileUri)}' Exists:${exists}`,
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
