export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** YYYY-MM-DD in Europe/Paris. */
export function parisDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export function partyRef(gameName: string, createdAt: Date): string {
  return `${slugify(gameName)}-${parisDate(createdAt)}`
}

export function participationRef(ref: string, playerName: string): string {
  return `${ref} · ${playerName}`
}
