import { SessionController } from './sessionController';

export class ExceptionSessionController extends SessionController {
  public override async onInitialize(): Promise<void> {
    this.disposables.push(
      this.context.exceptionManager.onExceptionAdded(({ name, enabled }) => {
        if (enabled) {
          this.addCatchBreakpoints(name);
        }
      }),
      this.context.exceptionManager.onExceptionChanged(({ name, enabled }) => {
        if (enabled) {
          this.addCatchBreakpoints(name);
        } else {
          this.deleteCatchBreakpoints(name);
        }
      }),
      this.context.exceptionManager.onExceptionRemoved(({ name }) => {
        this.deleteCatchBreakpoints(name);
      }),
    );

    await this.addCatchBreakpoints(
      ...this.context.exceptionManager.getEnabled().map(({ name }) => name),
    );
  }

  private async addCatchBreakpoints(...names: string[]): Promise<void> {
    if (names.length === 0) {
      return;
    }

    for (const name of names) {
      await this.session.sendEvalRequest(
        `DEBUGGER__::SESSION::add_bp DEBUGGER__::CatchBreakpoint.new("${name}")`,
      );
    }
    this.context.log.debug(`[${this.session.id}] Added catch breakpoints (${names.length})`);
  }

  private async deleteCatchBreakpoints(...names: string[]): Promise<void> {
    if (names.length === 0) {
      return;
    }

    for (const name of names) {
      await this.session.sendEvalRequest(
        `DEBUGGER__::SESSION::delete_bp (DEBUGGER__::SESSION::bp_index [:catch, "${name}"])[1]`,
      );
    }
    this.context.log.debug(`[${this.session.id}] Deleted catch breakpoints (${names.length})`);
  }
}
