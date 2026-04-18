import * as vscode from 'vscode';
import { Exception, ExceptionCategory } from './exception';

const STORAGE_KEY = 'tracciatto.exceptions';

export class ExceptionManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[];
  private readonly exceptions: Map<string, Exception>;
  private readonly memento: vscode.Memento;
  private readonly onExceptionAddedEmitter: vscode.EventEmitter<Exception>;
  private readonly onExceptionRemovedEmitter: vscode.EventEmitter<Exception>;
  private readonly onExceptionChangedEmitter: vscode.EventEmitter<Exception>;

  constructor(
    { workspaceState }: vscode.ExtensionContext,
    private readonly log: vscode.LogOutputChannel,
  ) {
    this.memento = workspaceState;
    this.exceptions = new Map();
    this.disposables = [
      (this.onExceptionAddedEmitter = new vscode.EventEmitter()),
      (this.onExceptionRemovedEmitter = new vscode.EventEmitter()),
      (this.onExceptionChangedEmitter = new vscode.EventEmitter()),
    ];

    this.initializeDefaults();
    this.load();
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
    this.disposables.length = 0;
  }

  public get onExceptionAdded(): vscode.Event<Exception> {
    return this.onExceptionAddedEmitter.event;
  }

  public get onExceptionChanged(): vscode.Event<Exception> {
    return this.onExceptionChangedEmitter.event;
  }

  public get onExceptionRemoved(): vscode.Event<Exception> {
    return this.onExceptionRemovedEmitter.event;
  }

  public getAll(): Exception[] {
    return [...this.exceptions.values()];
  }

  public getEnabled(): Exception[] {
    return [...this.exceptions.values()].filter((ex) => ex.enabled);
  }

  public isEnabled(name: string): boolean {
    return this.exceptions.get(name)?.enabled ?? false;
  }

  public addException(name: string, category: ExceptionCategory = 'User'): void {
    name = name.trim();
    if (!name || this.exceptions.has(name)) {
      return;
    }

    const exception: Exception = {
      expression: name,
      category,
      userDefined: category === 'User',
      enabled: false,
    };

    this.exceptions.set(name, exception);
    this.onExceptionAddedEmitter.fire(exception);
    void this.save();
  }

  public removeException(name: string): void {
    const existing = this.exceptions.get(name);
    if (!existing) {
      return;
    }

    if (!existing.userDefined) {
      return;
    }

    this.exceptions.delete(name);
    this.onExceptionRemovedEmitter.fire(existing);
    void this.save();
  }

  public setExceptionEnabled(name: string, enabled: boolean): void {
    const existing = this.exceptions.get(name.trim());
    if (!existing) {
      return;
    }

    if (existing.enabled === enabled) {
      return;
    }

    existing.enabled = enabled;
    this.onExceptionChangedEmitter.fire(existing);
    void this.save();
  }

  private initializeDefaults(): void {
    const builtIns = [
      'ArgumentError',
      'EncodingError',
      'IndexError',
      'KeyError',
      'NameError',
      'NoMethodError',
      'TypeError',
    ];

    for (const name of builtIns) {
      if (this.exceptions.has(name)) {
        continue;
      }

      this.exceptions.set(name, {
        expression: name,
        category: 'Built-in',
        userDefined: false,
        enabled: false,
      });
    }
  }

  private load(): void {
    const stored = this.memento.get<Record<string, boolean>>(STORAGE_KEY, {});

    for (const [name, enabled] of Object.entries(stored)) {
      const existing = this.exceptions.get(name);

      if (existing) {
        existing.enabled = enabled;
        continue;
      }

      this.exceptions.set(name, {
        expression: name,
        category: 'User',
        userDefined: true,
        enabled,
      });
    }
  }

  private async save(): Promise<void> {
    const data: Record<string, boolean> = {};

    for (const ex of this.exceptions.values()) {
      if (ex.userDefined || ex.enabled) {
        data[ex.expression] = Boolean(ex.enabled);
      }
    }

    await this.memento.update(STORAGE_KEY, data);
    this.log.debug(`Saved exception filters. Count: ${Object.keys(data).length}`);
  }
}
