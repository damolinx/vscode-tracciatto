import { ExceptionTreeNode } from '../exceptions/exceptionTreeProvider';
import { ExtensionContext } from '../extensionContext';

export async function removeException(
  { exceptionManager, log }: ExtensionContext,
  nameOrNode: string | ExceptionTreeNode,
): Promise<void> {
  const exceptionName = typeof nameOrNode === 'string' ? nameOrNode : nameOrNode.record.expression;
  exceptionManager.removeException(exceptionName);
  log.debug(`Removed exception. Name:${exceptionName}`);
}
