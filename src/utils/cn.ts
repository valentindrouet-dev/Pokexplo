type ClassValue = string | false | null | undefined;

/** Concatenation de classes CSS, sans dependance. */
export function cn(...values: ClassValue[]): string {
  return values.filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ');
}
