import { ExceptionTreeNode } from '../exceptions/exceptionTreeProvider';
import { ExtensionContext } from '../extensionContext';

export async function removeAllExceptions({
  exceptionManager,
  log,
}: ExtensionContext): Promise<void> {
  const count = exceptionManager.removeAllExceptions();
  if (count) {
    log.info(`Removed all exceptions. Count: ${count}`);
  } else {
    log.info('No exceptions to remove.');
  }
}

export async function removeException(
  { exceptionManager, log }: ExtensionContext,
  nameOrNode: string | ExceptionTreeNode,
): Promise<void> {
  const name = typeof nameOrNode === 'string' ? nameOrNode : nameOrNode.exception.name;
  exceptionManager.removeException(name);
  log.debug(`Removed exception. Name: '${name}'`);
}
