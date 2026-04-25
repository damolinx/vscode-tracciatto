import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { Exception, EXCEPTION_CATEGORIES, ExceptionCategory } from './exception';
import { ExceptionManager } from './exceptionManager';

export function registerExceptionTree(context: ExtensionContext): void {
  const exceptionsTree = new ExceptionTreeProvider(context);
  const exceptionsTreeView = vscode.window.createTreeView('tracciatto.exceptions', {
    showCollapseAll: true,
    treeDataProvider: exceptionsTree,
  });
  context.disposables.push(exceptionsTree, exceptionsTreeView);
}

export interface GroupTreeNode {
  category: ExceptionCategory;
  type: 'category';
}

export interface ExceptionTreeNode {
  exception: Exception;
  type: 'exception';
}

export type TreeNode = GroupTreeNode | ExceptionTreeNode;

export class ExceptionTreeProvider implements vscode.TreeDataProvider<TreeNode>, vscode.Disposable {
  private readonly disposables: vscode.Disposable[];
  private readonly exceptionManager: ExceptionManager;
  private readonly onDidChangeEmitter: vscode.EventEmitter<void>;

  constructor({ exceptionManager }: ExtensionContext) {
    this.exceptionManager = exceptionManager;
    this.onDidChangeEmitter = new vscode.EventEmitter();

    const exceptionHandler = () => this.onDidChangeEmitter.fire();
    this.disposables = [
      this.onDidChangeEmitter,
      this.exceptionManager.onExceptionAdded(exceptionHandler),
      this.exceptionManager.onExceptionRemoved(exceptionHandler),
      this.exceptionManager.onExceptionChanged(exceptionHandler),
    ];
  }

  dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
    this.disposables.length = 0;
  }

  public get onDidChangeTreeData(): vscode.Event<void> {
    return this.onDidChangeEmitter.event;
  }

  public getTreeItem(node: TreeNode): vscode.TreeItem {
    if (node.type === 'category') {
      const groupItem = new vscode.TreeItem(
        node.category,
        vscode.TreeItemCollapsibleState.Expanded,
      );
      if (node.category === 'User') {
        groupItem.contextValue = 'userGroup';
        groupItem.tooltip =
          'User-defined exception filters. You can add or remove filters in this group.';
      } else {
        groupItem.tooltip = 'Predefined exception filters. These cannot be removed.';
      }
      return groupItem;
    }

    const {
      exception: { enabled, name, userDefined },
    } = node;
    const item = new vscode.TreeItem(name);
    item.checkboxState = enabled
      ? { state: vscode.TreeItemCheckboxState.Checked, tooltip: 'Exception filter enabled' }
      : { state: vscode.TreeItemCheckboxState.Unchecked, tooltip: 'Exception filter disabled' };
    item.command = { command: 'tracciatto.toggleException', title: '', arguments: [name] };
    if (userDefined) {
      item.contextValue = 'userException';
    }
    return item;
  }

  public getChildren(node?: TreeNode): TreeNode[] | undefined {
    if (!node) {
      return [...EXCEPTION_CATEGORIES]
        .sort((a, b) => a.localeCompare(b))
        .map((category) => ({ type: 'category', category }));
    }

    if (node.type === 'category') {
      return this.exceptionManager
        .getByCategory(node.category)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((exception) => ({ type: 'exception', exception }));
    }

    return;
  }
}
