const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function newShareToken(length = 12): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  // 248 = 62 * 4: reject bytes above to keep the distribution uniform.
  let out = ''
  let i = 0
  while (out.length < length) {
    if (i >= bytes.length) {
      crypto.getRandomValues(bytes)
      i = 0
    }
    const b = bytes[i++]!
    if (b < 248) out += ALPHABET[b % 62]
  }
  return out
}
