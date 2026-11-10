/** Square game visual with a neutral fallback. */
export function GameThumb({ src, size = 44, alt = '' }: { src: string | null | undefined; size?: number; alt?: string }) {
  return src ? (
    <img src={src} alt={alt} width={size} height={size} loading="lazy" className="shrink-0 rounded-[10px] bg-surface-subtle object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="shrink-0 rounded-[10px] bg-surface-subtle" style={{ width: size, height: size }} />
  )
}
