import { ExceptionTreeNode } from '../exceptions/exceptionTreeProvider';
import { showExceptionInputBox } from '../exceptions/utils';
import { ExtensionContext } from '../extensionContext';

export async function editException(
  { exceptionManager, log }: ExtensionContext,
  nameOrNode: string | ExceptionTreeNode,
): Promise<void> {
  const name = typeof nameOrNode === 'string' ? nameOrNode : nameOrNode.exception.name;
  const existingNames = new Set(exceptionManager.getAllNames());
  if (!existingNames.has(name)) {
    throw new Error(`Unknown exception: ${name}`);
  }

  const newName = await showExceptionInputBox({
    additionalValidator: (value) => {
      if (value === name) {
        return;
      }
      if (existingNames.has(value)) {
        return 'Exception filter already exists';
      }
      return;
    },
    value: name,
  });
  if (!newName) {
    return;
  }

  if (exceptionManager.renameException(name, newName)) {
    log.debug(`Renamed exception. Old: '${name}' New: '${newName}'`);
  }
}
