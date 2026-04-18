import { ExceptionCategory } from '../exceptions/exception';
import { GroupTreeNode } from '../exceptions/exceptionTreeProvider';
import { showExceptionInputBox } from '../exceptions/utils';
import { ExtensionContext } from '../extensionContext';

export async function addException(
  { exceptionManager, log }: ExtensionContext,
  nameOrNode?: string | GroupTreeNode,
): Promise<void> {
  let category: ExceptionCategory = 'User';
  let exceptionName: string | undefined;
  if (typeof nameOrNode === 'string') {
    exceptionName = nameOrNode;
  } else {
    const existingNames = new Set(exceptionManager.getAll().map(({ expression }) => expression));
    exceptionName = await showExceptionInputBox((name) =>
      existingNames.has(name) ? 'Exception filter already exists' : undefined,
    );
    if (!exceptionName) {
      return;
    }
    if (nameOrNode) {
      category = nameOrNode.category;
    }
  }

  exceptionManager.addException(exceptionName, category);
  log.debug(`Added exception. Name:${exceptionName} Category: ${category}`);
}
