const VOWEL = /^[aeiouyàâäéèêëîïôöùûüÿæœ]/i

export function withDe(name: string): string {
  return VOWEL.test(name) ? `d’${name}` : `de ${name}`
}

export function withQue(name: string): string {
  return VOWEL.test(name) ? `qu’${name}` : `que ${name}`
}

export function points(n: number): string {
  return `${n} ${Math.abs(n) <= 1 ? 'point' : 'points'}`
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}
