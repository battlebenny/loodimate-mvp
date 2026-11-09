export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/** Player names are unique case-insensitively; accents stay significant. */
export function sameName(a: string, b: string): boolean {
  return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase()
}
