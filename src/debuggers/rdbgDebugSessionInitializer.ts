import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { RdbgDebugConfiguration } from './rdbgDebugConfiguration';

export class RdbgDebugSessionInitializer implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[];
  private readonly initializedSessionIds: WeakSet<vscode.DebugSession>;

  constructor(
    protected readonly context: ExtensionContext,
    private readonly type: string,
  ) {
    this.initializedSessionIds = new WeakSet();
    this.disposables = [
      vscode.debug.onDidStartDebugSession(async (session) => {
        if (session.type !== this.type) {
          return;
        }
        const configuration = session.configuration as RdbgDebugConfiguration;
        if (!configuration.skipPaths.length) {
          this.context.log.debug(
            `Configuration '${configuration.name}' defines no skip paths. Session: ${session.id}`,
          );
          return;
        }

        await this.initSkipPaths(session, configuration);
      }),
    ];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  protected async initSkipPaths(
    session: vscode.DebugSession,
    { skipPaths }: RdbgDebugConfiguration,
  ) {
    if (this.initializedSessionIds.has(session)) {
      this.context.log.debug(`Session already initialized. Session: ${session.id}`);
      return;
    }

    const expr = `,eval DEBUGGER__::CONFIG[:skip_path] = ["${skipPaths.join('", "')}"]`;
    if (!(await this.tryEvaluateWithRetries(session, expr, 3, 250))) {
      this.context.log.error(
        `Failed to initialize session, skip_paths not setup. Session: ${session}`,
      );
      return;
    }

    this.initializedSessionIds.add(session);
    this.context.log.debug(
      `Initialized session. Session: ${session.id} SkipPathCount: ${skipPaths.length}`,
    );
  }

  private async tryEvaluateWithRetries(
    session: vscode.DebugSession,
    expression: string,
    maxAttempts = 5,
    baseDelayMs = 500,
  ): Promise<boolean> {
    let result = false;
    for (let i = 1; i <= maxAttempts && !result; i++) {
      try {
        await this.withTimeout(
          session.customRequest('evaluate', { expression, context: 'repl' }),
          5000,
        );
        result = true;
      } catch (error: any) {
        this.context.log.warn(
          `Failed to initialize skip_paths. Attempt: ${i}/${maxAttempts} Error: ${error?.message ?? error}`,
        );
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * i));
      }
    }
    return result;
  }

  private withTimeout<T>(promise: Thenable<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }
}
