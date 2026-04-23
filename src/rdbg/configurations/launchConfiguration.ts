import { DebugConfiguration } from './debugConfiguration';

export interface LaunchConfiguration extends DebugConfiguration {
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  program: string;
  runtimeExecutable?: string;
}
