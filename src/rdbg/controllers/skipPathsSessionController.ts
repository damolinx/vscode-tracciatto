import { SessionController } from './sessionController';

export class SkipPathsSessionController extends SessionController {
  public override onInitialize(): Promise<void> {
    const { skipPaths } = this.session.configuration;
    return this.addSkipPaths(skipPaths);
  }

  public async addSkipPaths(skipPaths: string[]): Promise<void> {
    if (!skipPaths.length) {
      return;
    }

    await this.session.sendEvaluateRequest(
      `DEBUGGER__::CONFIG[:skip_path] = Array(DEBUGGER__::CONFIG[:skip_path]) | ${JSON.stringify(skipPaths)}`,
    );

    this.context.log.debug(`[${this.session.shortId}] Added skip-paths (${skipPaths.length})`);
  }

  public async removeSkipPaths(skipPaths: string[]): Promise<void> {
    if (!skipPaths.length) {
      return;
    }

    await this.session.sendEvaluateRequest(
      `DEBUGGER__::CONFIG[:skip_path] = Array(DEBUGGER__::CONFIG[:skip_path]) - ${JSON.stringify(skipPaths)}`,
    );

    this.context.log.debug(`[${this.session.shortId}] Removed skip-paths (${skipPaths.length})`);
  }
}
