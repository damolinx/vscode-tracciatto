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

    const jsonSkipPaths = JSON.stringify(skipPaths);
    await this.session.sendEvaluateRequest(
      `DEBUGGER__::CONFIG[:skip_path] = Array(DEBUGGER__::CONFIG[:skip_path]) | ${jsonSkipPaths}`,
    );

    this.context.log.debug(`[${this.session.shortId}] Added skip-paths (${skipPaths.length})`);
    this.context.log.trace(`[${this.session.shortId}] Paths: ${jsonSkipPaths}`);
  }

  public async removeSkipPaths(skipPaths: string[]): Promise<void> {
    if (!skipPaths.length) {
      return;
    }

    const jsonSkipPaths = JSON.stringify(skipPaths);
    await this.session.sendEvaluateRequest(
      `DEBUGGER__::CONFIG[:skip_path] = Array(DEBUGGER__::CONFIG[:skip_path]) - ${jsonSkipPaths}`,
    );

    this.context.log.debug(`[${this.session.shortId}] Removed skip-paths (${skipPaths.length})`);
    this.context.log.trace(`[${this.session.shortId}] Paths: ${jsonSkipPaths}`);
  }
}
