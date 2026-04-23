export const EXCEPTION_CATEGORIES = ['Built-in', 'User'] as const;
export type ExceptionCategory = (typeof EXCEPTION_CATEGORIES)[number];

export interface Exception {
  readonly category: ExceptionCategory;
  enabled?: boolean;
  readonly name: string;
  readonly userDefined?: true;
}
