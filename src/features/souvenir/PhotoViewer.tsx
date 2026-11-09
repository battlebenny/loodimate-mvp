import { useEffect, useRef, useState } from 'react'

export function PhotoViewer({ photos, start, onClose }: { photos: { url: string }[]; start: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [i, setI] = useState(start)
  const touch = useRef<number | null>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  const go = (d: number) => setI((x) => (x + d + photos.length) % photos.length)
  return (
    <dialog
      ref={ref}
      aria-label="Photo en plein écran"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-black p-0 text-white"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-4 pt-[calc(12px+var(--safe-top))] pb-3">
          <span className="text-sm">
            {i + 1} / {photos.length}
          </span>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex size-11 items-center justify-center rounded-full bg-white/90 text-black">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div
          className="flex min-h-0 grow items-center justify-center"
          onTouchStart={(e) => (touch.current = e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            const start = touch.current
            const end = e.changedTouches[0]?.clientX
            touch.current = null
            if (start !== null && end !== undefined && Math.abs(end - start) > 40) go(end < start ? 1 : -1)
          }}
        >
          <img src={photos[i]?.url} alt={`Photo ${i + 1}`} className="max-h-full max-w-full object-contain" />
        </div>
        {photos.length > 1 && (
          <div className="flex justify-between px-4 pt-3 pb-[calc(16px+var(--safe-bottom))]">
            <button type="button" onClick={() => go(-1)} className="min-h-11 px-3 font-semibold">
              Précédente
            </button>
            <button type="button" onClick={() => go(1)} className="min-h-11 px-3 font-semibold">
              Suivante
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}
