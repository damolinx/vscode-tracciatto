import * as vscode from 'vscode';
import { EXTENSION_PREFIX } from './constants';

export class Configuration {
  /**
   * Get a {@link EXTENSION_PREFIX `traciatto`} configuration object scoped by {@link scope}.
   */
  private getConfiguration(scope?: vscode.ConfigurationScope): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(EXTENSION_PREFIX, scope);
  }

  /**
   * Get a {@link getConfiguration configuration} value from a specific {@link scope}.
   * @param section — Configuration name, supports dotted names.
   * @param defaultValue — Value returned if the setting is not defined.
   */
  public getValue<T>(scope: vscode.ConfigurationScope | undefined, section: string): T | undefined;
  public getValue<T>(
    scope: vscode.ConfigurationScope | undefined,
    section: string,
    defaultValue: T,
  ): T;
  public getValue<T>(
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
   * Configured Ruby executable.
   */
  public getRuntimeExecutable(
    scope: vscode.ConfigurationScope | undefined,
    defaultValue = 'ruby',
  ): string {
    return this.getValue<string>(scope, 'runtimeExecutable', defaultValue) ?? defaultValue;
  }
}
