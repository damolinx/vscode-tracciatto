import * as vscode from 'vscode';
import { DebugType } from '../constants';
import { ExtensionContext } from '../extensionContext';
import { DebugAdapterTracker } from './debugAdapterTracker';

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

    return new DebugAdapterTracker(this.context, session);
  }
}
