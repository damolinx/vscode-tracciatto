import { DebugConfiguration } from '../configurations/debugConfiguration';
import { SessionController } from './sessionController';

export class SkipPathsSessionController extends SessionController {
  public override async onInitialize(): Promise<void> {
    const config = this.session.configuration as DebugConfiguration;
    const skipPathsLength = config.skipPaths?.length ?? 0;
    if (skipPathsLength) {
      await this.session.sendEvaluateRequest(
        `DEBUGGER__::CONFIG[:skip_path] = Array(DEBUGGER__::CONFIG[:skip_path]) | ["${config.skipPaths.join('", "')}"]`,
      );
    }
    this.context.log.debug(`[${this.session.id}] Initialized skip-paths (${skipPathsLength})`);
  }
}
