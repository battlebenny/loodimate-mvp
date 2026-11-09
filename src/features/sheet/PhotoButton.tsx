import { useRef, useState } from 'react'
import { api } from '../../lib/api'
import { compressImage } from '../../lib/image'
import type { PartyDTO } from '../../../shared/types'

export const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8h3l2-3h5" />
    <path d="M21 12v7H3V8" />
    <circle cx="11" cy="13" r="3.5" />
    <path d="M19 3v6M16 6h6" />
  </svg>
)

/** Opens the native camera, compresses the photo and attaches it to the party (3 max). */
export function usePhotoUpload(partyId: string, onDone: (p: PartyDTO) => void) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const pick = () => input.current?.click()
  const element = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      capture="environment"
      hidden
      onChange={async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        setBusy(true)
        setError(undefined)
        try {
          const photo = await compressImage(file)
          onDone(await api<PartyDTO>('POST', `parties/${partyId}/photos`, photo))
        } catch (err) {
          setError(err instanceof Error && 'code' in err ? err.message : "La photo n'a pas pu être ajoutée.")
        } finally {
          setBusy(false)
        }
      }}
    />
  )
  return { pick, busy, error, element }
}

export function PhotoButton({ count, busy, onPick }: { count: number; busy: boolean; onPick: () => void }) {
  const full = count >= 3
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={full || busy}
      aria-label={full ? 'Photos : 3 sur 3' : `Prendre une photo, ${count} sur 3`}
      aria-busy={busy || undefined}
      className="relative flex size-[52px] shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-ink bg-surface text-ink disabled:border-line disabled:text-ink-soft"
    >
      {busy ? <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <CameraIcon />}
      {count > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-bg">{count}</span>}
    </button>
  )
}
