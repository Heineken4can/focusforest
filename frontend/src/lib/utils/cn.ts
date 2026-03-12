type ClassValue = string | false | null | undefined;

export function cn(...classValues: ClassValue[]) {
  return classValues.filter(Boolean).join(' ');
}
