import * as vscode from 'vscode';

let mruExceptionName: string | undefined;
export async function showExceptionInputBox(options?: {
  additionalValidator?: (name: string) => string | undefined;
  value?: string;
}): Promise<string | undefined> {
  const exceptionName = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'e.g., NoMethodError, NameError, ActiveRecord::RecordNotFound',
    placeHolder: 'Enter a Ruby error constant name',
    validateInput: (value) => validateExceptionName(value, options?.additionalValidator),
    value: options?.value ?? mruExceptionName,
  });

  if (!exceptionName) {
    return;
  }

  mruExceptionName = exceptionName;
  return exceptionName;
}

function validateExceptionName(
  name: string,
  additionalValidator?: (name: string) => string | undefined,
): string | undefined {
  const normalizedValue = name.trim();
  if (!normalizedValue) {
    return 'Error name cannot be empty';
  }

  if (!/^[A-Z]\w*(::\w+)*$/.test(normalizedValue)) {
    return 'Invalid Ruby constant';
  }

  if (additionalValidator) {
    const additionalValidation = additionalValidator(normalizedValue);
    if (additionalValidation) {
      return additionalValidation;
    }
  }

  return;
}
