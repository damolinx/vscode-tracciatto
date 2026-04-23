import * as vscode from 'vscode';
import { DebugType } from '../constants';
import { ExtensionContext } from '../extensionContext';
import { DebugAdapterTracker } from './debugAdapterTracker';
import { SetVariableDebugAdapterTracker } from './experimental/setVariableDebugAdapterTracker';

export function registerDebugAdapterTrackerFactory(
  context: ExtensionContext,
  type: DebugType,
): void {
  context.disposables.push(
    vscode.debug.registerDebugAdapterTrackerFactory(
      type,
      new DebugAdapterTrackerFactory(context, type),
    ),
  );
}

export class DebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
  constructor(
    private readonly context: ExtensionContext,
    private readonly type: DebugType,
  ) {}

  createDebugAdapterTracker(session: vscode.DebugSession): vscode.DebugAdapterTracker | undefined {
    if (session.type !== this.type) {
      return;
    }

    if (
      this.context.configuration.getValue<boolean>(
        session.workspaceFolder,
        'patchSetVariable',
        false,
      )
    ) {
      return new SetVariableDebugAdapterTracker(this.context, session);
    }

    return new DebugAdapterTracker(this.context, session);
  }
}
