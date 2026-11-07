import { ExtensionContext } from '../extensionContext';

export function toggleException(
  { exceptionManager, log }: ExtensionContext,
  exceptionName: string,
): void {
  const newState = !exceptionManager.isExceptionEnabled(exceptionName);
  exceptionManager.setExceptionEnabled(exceptionName, newState);
  log.debug(`Toggled exception state. Name:${exceptionName} Newstate:${newState}`);
}
