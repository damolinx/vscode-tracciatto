import { ExceptionCategory } from '../exceptions/exception';
import { GroupTreeNode } from '../exceptions/exceptionTreeProvider';
import { showExceptionInputBox } from '../exceptions/utils';
import { ExtensionContext } from '../extensionContext';

export async function addException(
  { exceptionManager, log }: ExtensionContext,
  nameOrNode?: string | GroupTreeNode,
): Promise<void> {
  let category: ExceptionCategory = 'User';
  let name: string | undefined;
  if (typeof nameOrNode === 'string') {
    name = nameOrNode;
  } else {
    const existingNames = new Set(exceptionManager.getAllNames());
    name = await showExceptionInputBox({
      additionalValidator: (value) =>
        existingNames.has(value) ? 'Exception filter already exists' : undefined,
    });
    if (!name) {
      return;
    }
    if (nameOrNode) {
      category = nameOrNode.category;
    }
  }

  const added = exceptionManager.addException(name, category);
  if (added) {
    log.debug(`Added exception. Name: '${name}' Category: '${category}'`);
  }
}
