import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { Configuration } from '../configuration';

type OutputFormat = 'json' | 'line';
type RubyEnvManager = 'asdf' | 'custom' | 'rbenv' | 'rvm' | 'none';

const MANAGER_KEY = 'rubyEnvironmentManager';
const CUSTOM_CMD_KEY = 'customRubyEnvironmentCommand';
const CUSTOM_CMD_OUTOUT_FORMAT_KEY = 'customRubyEnvironmentCommandOutputFormat';

export class RubyEnvProvider implements vscode.Disposable {
  private readonly cache: Map<
    string,
    { manager: RubyEnvManager; env: NodeJS.ProcessEnv; envSize: number }
  >;
  private readonly disposables: vscode.Disposable[];

  constructor(
    private readonly configuration: Configuration,
    private readonly log: vscode.LogOutputChannel,
  ) {
    this.cache = new Map();

    const watcher = vscode.workspace.createFileSystemWatcher(
      '**/{.ruby-version,.tool-versions,.rvmrc}',
    );
    const handler = (uri: vscode.Uri) => this.clearCache(uri);
    watcher.onDidCreate(handler);
    watcher.onDidChange(handler);
    watcher.onDidDelete(handler);

    this.disposables = [
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration(`tracciatto.${MANAGER_KEY}`) ||
          e.affectsConfiguration(`tracciatto.${CUSTOM_CMD_KEY}`)
        ) {
          this.clearCache();
        }
      }),
      watcher,
    ];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  public clearCache(uri?: vscode.Uri) {
    if (uri) {
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (folder && this.cache.delete(folder.uri.fsPath)) {
        this.log.info(`RubyEnv: reset cache for workspace: '${folder.name}'`);
      }
    } else {
      this.cache.clear();
      this.log.info('RubyEnv: reset cache');
    }
  }

  private getManagerFor(
    folder: vscode.WorkspaceFolder,
    defaultValue: RubyEnvManager = 'none',
  ): RubyEnvManager {
    return this.configuration.getValue<RubyEnvManager>(folder, MANAGER_KEY, defaultValue);
  }

  private getManagerCommand(manager: 'none'): undefined;
  private getManagerCommand(
    manager: Omit<RubyEnvManager, 'none'>,
    scope: vscode.ConfigurationScope,
  ): string;
  private getManagerCommand(
    manager: RubyEnvManager,
    scope?: vscode.ConfigurationScope,
  ): string | undefined {
    switch (manager) {
      case 'asdf':
        return "asdf exec ruby -rjson -e 'print JSON.dump(ENV.to_h)'";
      case 'custom': {
        const custom = this.configuration.getValue<string>(scope, CUSTOM_CMD_KEY, '')?.trim();
        if (!custom) {
          throw new Error(
            `Missing custom Ruby version manager path. Check 'tracciatto.${CUSTOM_CMD_KEY}`,
          );
        }
        return custom;
      }
      case 'rbenv':
        return "rbenv exec ruby -rjson -e 'print JSON.dump(ENV.to_h)'";
      case 'rvm':
        return 'source "$HOME/.rvm/scripts/rvm" && ruby -rjson -e \'print JSON.dump(ENV.to_h)\'';
      case 'none':
        return undefined;
      default:
        throw new Error(`Unknown Ruby version manager: ${manager satisfies never}`);
    }
  }

  public async resolveEnv(folder?: vscode.WorkspaceFolder): Promise<NodeJS.ProcessEnv | undefined> {
    if (!folder) {
      this.log.debug('RubyEnv: No context folder, cannot resolve env');
      return;
    }

    const key = folder.uri.fsPath;
    const cachedEntry = this.cache.get(key);
    if (cachedEntry) {
      this.log.info(
        `RubyEnv(${cachedEntry.manager}): Using cached environment. EnvVarCount: ${cachedEntry.envSize}`,
      );
      return cachedEntry.env;
    }

    const manager = this.getManagerFor(folder);
    if (manager === 'none') {
      this.log.info('RubyEnv(none): No version manager selected; using default environment');
      return;
    }
    const format =
      manager === 'custom'
        ? this.configuration.getValue<OutputFormat>(folder, CUSTOM_CMD_OUTOUT_FORMAT_KEY, 'json')
        : 'json';
    const env = await this.loadManagerEnv(folder, this.getManagerCommand(manager, folder), format);
    if (!env) {
      throw new Error(
        `Ruby environment resolution failed for manager '${manager}'. ` +
          'Check that the Ruby version is installed and the version manager is configured correctly.',
      );
    }

    const entry = { manager, env, envSize: Object.keys(env).length };
    this.cache.set(key, entry);
    this.log.info(
      `RubyEnv(${entry.manager}): Using resolved environment. EnvVarCount: ${entry.envSize}`,
    );

    return env;
  }

  private async loadManagerEnv(
    folder: vscode.WorkspaceFolder,
    command: string,
    outputFormat: OutputFormat = 'json',
  ): Promise<NodeJS.ProcessEnv | undefined> {
    const shell = this.resolveShell();
    const cwd = folder.uri.fsPath;

    return new Promise((resolve, _reject) => {
      this.log.info(`Running: ${shell} --login -c "${command.replace(/"/g, '\\"')}"`);
      execFile(
        shell,
        ['--login', '-c', command],
        { cwd, encoding: 'utf8' },
        (err, stdout, stderr) => {
          if (err) {
            this.log.error(
              `Env capture failed (${shell}): ${err.message}${stderr ? `\n${stderr}` : ''}`,
            );
            return resolve(undefined);
          }

          try {
            switch (outputFormat) {
              case 'json':
                resolve(this.parseJsonOutput(stdout.trim()));
                break;
              case 'line':
                resolve(this.parseLineOutput(stdout.trim()));
                break;
              default:
                this.log.error(`Unsupported env-output format: ${outputFormat satisfies never}`);
                resolve(undefined);
                break;
            }
          } catch (error) {
            this.log.error(
              `Failed to parse process manager output as '${outputFormat}' format - verify tracciatto.${CUSTOM_CMD_OUTOUT_FORMAT_KEY}\nError: ${error}\nstdout: ${stdout}\nstderr: ${stderr}`,
            );
            resolve(undefined);
          }
        },
      );
    });
  }

  private resolveShell(scope?: vscode.ConfigurationScope): string {
    const platform =
      process.platform === 'darwin' ? 'osx' : process.platform === 'win32' ? 'windows' : 'linux';

    const config = vscode.workspace.getConfiguration('terminal.integrated', scope);
    const profiles = config.get<Record<string, any>>(`profiles.${platform}`);
    const defaultProfileName = config.get<string>(`defaultProfile.${platform}`);

    if (profiles && defaultProfileName) {
      const profile = profiles[defaultProfileName];
      if (profile) {
        const path = profile.path;
        if (typeof path === 'string') {
          return path;
        } else if (Array.isArray(path) && typeof path[0] === 'string') {
          return path[0];
        }
      }
    }

    return process.env.SHELL ?? (process.platform === 'win32' ? 'cmd.exe' : '/bin/bash');
  }

  private parseLineOutput(output: string): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {};
    for (const line of output.split(/\r?\n/)) {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1);
        env[key] = val;
      }
    }
    return env;
  }

  private parseJsonOutput(output: string): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {};
    const parsed = JSON.parse(output);
    for (const [k, v] of Object.entries(parsed)) {
      env[k] = String(v);
    }
    return env;
  }
}
