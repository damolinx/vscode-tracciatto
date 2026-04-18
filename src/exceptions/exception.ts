export const EXCEPTION_CATEGORIES = ['Built-in', 'User'] as const;
export type ExceptionCategory = (typeof EXCEPTION_CATEGORIES)[number];

export interface Exception {
  category: ExceptionCategory;
  enabled?: boolean;
  expression: string;
  userDefined: boolean;
}
