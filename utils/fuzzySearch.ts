// Overload signature (no constraint - this overrides any global declarations)
export function fuzzySearch<T>(
  items: T[] | undefined,
  query?: string,
  getText?: (item: T) => string
): T[];

// Implementation
export function fuzzySearch<T = any>(
  items: T[] = [],
  query?: string,
  getText?: (item: T) => string
): T[] {
  if (!items || items.length === 0) return [];
  if (!query) return [...items];

  const q = String(query).trim().toLowerCase();
  if (!q) return [...items];

  const extractor = getText ?? ((item: any) => {
    if (item == null) return "";
    if (typeof item === "string") return item;
    if (typeof item === "object") return String((item as any).name ?? "");
    return String(item);
  });

  return items.filter(item => {
    try {
      return extractor(item).toLowerCase().includes(q);
    } catch {
      return false;
    }
  });
}