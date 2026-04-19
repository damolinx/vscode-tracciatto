import * as vscode from 'vscode';
import { EXTENSION_PREFIX } from './constants';

export class Configuration {
  /**
   * Get a {@link EXTENSION_PREFIX `tracciatto`} configuration object scoped by {@link scope}.
   */
  private getConfiguration(scope?: vscode.ConfigurationScope): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(EXTENSION_PREFIX, scope);
  }

  /**
   * Get a {@link getConfiguration configuration} value from a specific {@link scope}.
   * @param section — Configuration name, supports dotted names.
   * @param defaultValue — Value returned if the setting is not defined.
   */
  private getValue<T>(scope: vscode.ConfigurationScope | undefined, section: string): T | undefined;
  private getValue<T>(
    scope: vscode.ConfigurationScope | undefined,
    section: string,
    defaultValue: T,
  ): T;
  private getValue<T>(
    scope: vscode.ConfigurationScope | undefined,
    section: string,
    defaultValue?: T,
  ): T | undefined {
    return this.getConfiguration(scope).get(section, defaultValue);
  }

  /**
   * Get a {@link getConfiguration configuration} value, applying VS Code's
   * normal precedence rules.
   * @param section — Configuration name, supports dotted names.
   * @param defaultValue — Value returned if the setting is not defined.
   */
  public resolveValue<T>(section: string): T | undefined;
  public resolveValue<T>(section: string, defaultValue: T): T;
  public resolveValue<T>(section: string, defaultValue?: T): T | undefined {
    return this.getConfiguration().get(section, defaultValue);
  }

  /**
   * Whether to prefer running under `bundle exec` when a Gemfile is present.
   * and no explicit runtimeExecutable is defined in the debug configuration.
   */
  public getPreferBundler(
    scope: vscode.ConfigurationScope | undefined,
    defaultValue = true,
  ): boolean {
    return this.getValue<boolean>(scope, 'debug.preferBundler', defaultValue) ?? defaultValue;
  }

  /**
   * Get Ruby executable name/path.
   */
  public getRuntimeExecutable(
    scope: vscode.ConfigurationScope | undefined,
    defaultValue = 'ruby',
  ): string {
    return this.getValue<string>(scope, 'debug.runtimeExecutable', defaultValue) ?? defaultValue;
  }

  /**
   * Get skip paths for rdbg stepping.
   */
  public getSkipPaths(scope: vscode.ConfigurationScope | undefined): string[] {
    return this.getValue<string[]>(scope, 'debug.skipPaths', []) ?? [];
  }

  /**
   * Get the filename used for project-level skip paths.
   */
  public getSkipPathsFileName(
    scope: vscode.ConfigurationScope | undefined,
    defaultValue = '.tracciatto-skip-paths',
  ): string {
    return this.getValue<string>(scope, 'debug.skipPathsFileName', defaultValue) ?? defaultValue;
  }

  /**
   * Whether to log DAP messages for debugging.
   */
  public getLogDapMessages(
    scope: vscode.ConfigurationScope | undefined,
    defaultValue = false,
  ): boolean {
    return this.getValue<boolean>(scope, 'logDapMessages', defaultValue) ?? defaultValue;
  }
}
