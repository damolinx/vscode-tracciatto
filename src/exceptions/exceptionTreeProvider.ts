import * as vscode from 'vscode';
import { ExtensionContext } from '../extensionContext';
import { Exception, EXCEPTION_CATEGORIES, ExceptionCategory } from './exception';
import { ExceptionManager } from './exceptionManager';
import { NaturalComparer } from '../utils/comparer';

export function registerExceptionTree(context: ExtensionContext): void {
  const treeDataProvider = new ExceptionTreeProvider(context);
  const treeView = vscode.window.createTreeView('tracciatto.exceptions', {
    showCollapseAll: true,
    treeDataProvider,
  });

  const { exceptionManager } = context;
  const handler = (exception: Exception) =>
    treeView.reveal({ type: 'exception', exception }, { expand: true, focus: true, select: true });
  context.disposables.push(
    treeDataProvider,
    treeView,
    treeView.onDidChangeCheckboxState(({ items }) => {
      for (const [node, state] of items) {
        if (node.type === 'exception') {
          context.exceptionManager.setExceptionEnabled(
            node.exception.name,
            state === vscode.TreeItemCheckboxState.Checked,
          );
        }
      }
    }),
    exceptionManager.onExceptionAdded(handler),
    exceptionManager.onExceptionChanged(handler),
  );
}

export interface GroupTreeNode {
  category: ExceptionCategory;
  type: 'category';
}

export interface ExceptionTreeNode {
  exception: Exception;
  type: 'exception';
}

type TreeNode = GroupTreeNode | ExceptionTreeNode;

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
    switch (node.type) {
      case 'category':
        return getCategoryTreeItem(node);
      case 'exception':
        return getExceptionTreeItem(node);
    }

    function getCategoryTreeItem({ category }: GroupTreeNode): vscode.TreeItem {
      const groupItem = new vscode.TreeItem(category, vscode.TreeItemCollapsibleState.Expanded);
      if (category === 'User') {
        groupItem.contextValue = 'userGroup';
        groupItem.tooltip =
          'User-defined exception filters. You can add or remove filters in this group.';
      } else {
        groupItem.tooltip = 'Predefined exception filters. These cannot be removed.';
      }
      return groupItem;
    }

    function getExceptionTreeItem({
      exception: { enabled, defaultEnabled, name, userDefined },
    }: ExceptionTreeNode): vscode.TreeItem {
      const item = new vscode.TreeItem(name);
      item.checkboxState = enabled
        ? { state: vscode.TreeItemCheckboxState.Checked, tooltip: 'Exception filter enabled' }
        : { state: vscode.TreeItemCheckboxState.Unchecked, tooltip: 'Exception filter disabled' };
      item.command = { command: 'tracciatto.toggleException', title: '', arguments: [name] };

      if (userDefined) {
        item.contextValue = 'userException';
      } else {
        item.tooltip = `${name} ${defaultEnabled ? '(enabled by default)' : '(disabled by default)'}`;
      }
      return item;
    }
  }

  public getChildren(node?: TreeNode): TreeNode[] | undefined {
    if (!node) {
      return [...EXCEPTION_CATEGORIES]
        .sort(NaturalComparer.compare)
        .map((category) => ({ type: 'category', category }));
    }

    if (node.type === 'category') {
      return this.exceptionManager
        .getByCategory(node.category)
        .sort((a, b) => NaturalComparer.compare(a.name, b.name))
        .map((exception) => ({ type: 'exception', exception }));
    }

    return;
  }

  public getParent?(node: TreeNode): TreeNode | undefined {
    if (node.type === 'exception') {
      return { type: 'category', category: node.exception.category };
    }
    return;
  }
}
