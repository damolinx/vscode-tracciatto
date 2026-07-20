import { SessionController } from './sessionController';

export class SkipPathsSessionController extends SessionController {
  public override async onInitialize(): Promise<void> {
    const { skipPaths } = this.session.configuration;
    const skipPathsLength = skipPaths?.length ?? 0;
    if (!skipPathsLength) {
      return;
    }

    await this.session.sendEvaluateRequest(
      `DEBUGGER__::CONFIG[:skip_path] = Array(DEBUGGER__::CONFIG[:skip_path]) | ["${skipPaths.join('", "')}"]`,
    );
    this.context.log.debug(`[${this.session.shortId}] Initialized skip-paths (${skipPathsLength})`);
  }
}
