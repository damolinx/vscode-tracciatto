import { ExtensionContext } from '../extensionContext';

export async function toggleException(
  { exceptionManager, log }: ExtensionContext,
  exceptionName: string,
): Promise<void> {
  const newState = !exceptionManager.isEnabled(exceptionName);
  exceptionManager.setExceptionEnabled(exceptionName, newState);
  log.debug(`Toggled exception state. Name:${exceptionName} Newstate:${newState}`);
}
