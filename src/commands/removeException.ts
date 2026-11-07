import { ExceptionTreeNode } from '../exceptions/exceptionTreeProvider';
import { ExtensionContext } from '../extensionContext';

export function removeAllExceptions({ exceptionManager, log }: ExtensionContext): void {
  const count = exceptionManager.removeAllExceptions();
  if (count) {
    log.info(`Removed all exceptions. Count: ${count}`);
  } else {
    log.info('No exceptions to remove.');
  }
}

export function removeException(
  { exceptionManager, log }: ExtensionContext,
  nameOrNode: string | ExceptionTreeNode,
): void {
  const name = typeof nameOrNode === 'string' ? nameOrNode : nameOrNode.exception.name;
  const removed = exceptionManager.removeException(name);
  if (removed) {
    log.debug(`Removed exception. Name: '${name}'`);
  }
}
