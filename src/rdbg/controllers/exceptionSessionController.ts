import { SessionController } from './sessionController';

export class ExceptionSessionController extends SessionController {
  public override async onInitialize(): Promise<void> {
    this.disposables.push(
      this.context.exceptionManager.onExceptionAdded(({ expression, enabled }) => {
        if (enabled) {
          this.addCatchBreakpoints(expression);
        }
      }),
      this.context.exceptionManager.onExceptionChanged(({ expression, enabled }) => {
        if (enabled) {
          this.addCatchBreakpoints(expression);
        } else {
          this.deleteCatchBreakpoints(expression);
        }
      }),
      this.context.exceptionManager.onExceptionRemoved(({ expression }) => {
        this.deleteCatchBreakpoints(expression);
      }),
    );

    await this.addCatchBreakpoints(
      ...this.context.exceptionManager.getEnabled().map(({ expression }) => expression),
    );
  }

  private async addCatchBreakpoints(...expressions: string[]): Promise<void> {
    if (expressions.length === 0) {
      return;
    }

    for (const expression of expressions) {
      await this.sendReplRequest(
        `,eval DEBUGGER__::SESSION::add_bp DEBUGGER__::CatchBreakpoint.new("${expression}")`,
      );
    }
    this.context.log.debug(`[${this.session.id}] Added catch breakpoints (${expressions.length})`);
  }

  private async deleteCatchBreakpoints(...expressions: string[]): Promise<void> {
    if (expressions.length === 0) {
      return;
    }

    for (const expression of expressions) {
      await this.sendReplRequest(
        `,eval DEBUGGER__::SESSION::delete_bp (DEBUGGER__::SESSION::bp_index [:catch, "${expression}"])[1]`,
      );
    }
    this.context.log.debug(
      `[${this.session.id}] Deleted catch breakpoints (${expressions.length})`,
    );
  }
}
