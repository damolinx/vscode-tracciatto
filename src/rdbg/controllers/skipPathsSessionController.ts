import { DebugConfiguration } from '../debugConfiguration';
import { SessionController } from './sessionController';

export class SkipPathsSessionController extends SessionController {
  public override async onInitialize(): Promise<void> {
    const configuration = this.session.configuration as DebugConfiguration;
    const skipPathsLength = configuration.skipPaths?.length ?? 0;
    if (skipPathsLength) {
      await this.sendReplRequest(
        `,eval DEBUGGER__::CONFIG[:skip_path] = ["${configuration.skipPaths.join('", "')}"]`,
      );
    }
    this.context.log.debug(`[${this.session.id}] Initialized skip-paths (${skipPathsLength})`);
  }
}
