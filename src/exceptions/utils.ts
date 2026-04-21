import * as vscode from 'vscode';

let mruExceptionName: string | undefined;
export async function showExceptionInputBox(
  additionalValidator?: (name: string) => string | undefined,
): Promise<string | undefined> {
  const value = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'e.g., NoMethodError, NameError, ActiveRecord::RecordNotFound',
    placeHolder: 'Enter a Ruby error constant name',
    validateInput: (value) => validateExceptionName(value, additionalValidator),
    value: mruExceptionName,
  });

  if (!value) {
    return;
  }

  mruExceptionName = value;
  return value;
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
