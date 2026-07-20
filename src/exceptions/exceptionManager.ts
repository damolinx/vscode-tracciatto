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

  public addException(name: string, category: ExceptionCategory = 'User'): void {
    const normalizedName = name.trim();
    if (!normalizedName || this.exceptions.has(normalizedName)) {
      return;
    }

    const exception = {
      category,
      enabled: false,
      name: normalizedName,
      userDefined: category === 'User' ? true : undefined,
    } as Exception;

    this.exceptions.set(normalizedName, exception);
    this.onExceptionAddedEmitter.fire(exception);
    this.save();
  }

  public getAll(): Exception[] {
    return Array.from(this.exceptions.values());
  }

  public getAllNames(): string[] {
    return Array.from(this.exceptions.keys());
  }

  public getByCategory(category: ExceptionCategory): Exception[] {
    const exceptions: Exception[] = [];
    for (const exception of this.exceptions.values()) {
      if (exception.category === category) {
        exceptions.push(exception);
      }
    }
    return exceptions;
  }

  public getByEnablement(enabled: boolean): Exception[] {
    const exceptions: Exception[] = [];
    for (const exception of this.exceptions.values()) {
      if (exception.enabled === enabled) {
        exceptions.push(exception);
      }
    }
    return exceptions;
  }

  public isExceptionEnabled(name: string): boolean {
    return this.exceptions.get(name)?.enabled ?? false;
  }

  public removeAllExceptions(): number {
    let count = 0;
    for (const exception of this.exceptions.values()) {
      if (exception.userDefined) {
        this.exceptions.delete(exception.name);
        this.onExceptionChangedEmitter.fire(exception);
        count++;
      }
    }

    if (count) {
      this.save();
    }

    return count;
  }

  public removeException(name: string): void {
    const exception = this.exceptions.get(name);
    if (!exception?.userDefined) {
      return;
    }

    this.exceptions.delete(name);
    this.onExceptionRemovedEmitter.fire(exception);
    this.save();
  }

  public renameException(oldName: string, newName: string): boolean {
    if (oldName === newName) {
      return false;
    }

    const oldException = this.exceptions.get(oldName);
    if (!oldException) {
      return false;
    }
    this.exceptions.delete(oldName);

    const newException = { ...oldException, name: newName };
    this.exceptions.set(newName, newException);

    this.onExceptionRemovedEmitter.fire(oldException);
    this.onExceptionAddedEmitter.fire(newException);
    this.save();
    return true;
  }

  public setExceptionEnabled(name: string, enabled: boolean): void {
    const exception = this.exceptions.get(name.trim());
    if (!exception) {
      return;
    }

    if (exception.enabled === enabled) {
      return;
    }

    exception.enabled = enabled;
    this.onExceptionChangedEmitter.fire(exception);
    this.save();
  }

  private initializeDefaults(): void {
    const exceptions: Exception[] = [
      { category: 'Built-in', name: 'ArgumentError' },
      { category: 'Built-in', name: 'EncodingError' },
      { category: 'Built-in', name: 'IndexError' },
      { category: 'Built-in', name: 'KeyError' },
      { category: 'Built-in', name: 'LoadError', enabled: true, defaultEnabled: true },
      { category: 'Built-in', name: 'NameError' },
      { category: 'Built-in', name: 'NoMethodError' },
      { category: 'Built-in', name: 'TypeError' },
    ];

    for (const exception of exceptions) {
      this.exceptions.set(exception.name, exception);
    }
  }

  private load(): void {
    const stored = this.memento.get<Record<string, boolean>>(STORAGE_KEY, {});

    for (const [name, enabled] of Object.entries(stored)) {
      const exception = this.exceptions.get(name);
      if (exception) {
        exception.enabled = enabled;
        continue;
      }

      this.exceptions.set(name, {
        category: 'User',
        enabled,
        name,
        userDefined: true,
      });
    }
  }

  private save(): void {
    const data: Record<string, boolean> = {};

    for (const ex of this.exceptions.values()) {
      if (ex.userDefined || ex.enabled !== ex.defaultEnabled) {
        data[ex.name] = Boolean(ex.enabled);
      }
    }

    // Intentionally not awaiting
    this.memento.update(STORAGE_KEY, data);
    this.log.debug(`Saved exception filters. Count: ${Object.keys(data).length}`);
  }
}
