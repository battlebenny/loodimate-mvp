import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { api } from '../../lib/api'
import type { PartyDTO } from '../../../shared/types'

type Photo = PartyDTO['photos'][number]

/**
 * Deleting a photo, confirmed in a bottom sheet (Loodi's confirmation pattern).
 * Shared by the score sheet (badge on a thumbnail) and the souvenir (trash on the slideshow).
 */
export function usePhotoRemoval(partyId: string, onDone: (p: PartyDTO) => void) {
  const [target, setTarget] = useState<Photo | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const close = () => {
    if (busy) return
    setTarget(null)
    setError(undefined)
  }
  async function confirm() {
    if (!target) return
    setBusy(true)
    setError(undefined)
    try {
      onDone(await api<PartyDTO>('DELETE', `parties/${partyId}/photos/${encodeURIComponent(target.id)}`))
      setTarget(null)
    } catch {
      setError('Impossible de supprimer la photo. Réessaie dans un instant.')
    } finally {
      setBusy(false)
    }
  }
  const element = (
    <Sheet open={!!target} title="Supprimer cette photo ?" onClose={close} closeLabel="Annuler">
      {target && <img src={target.thumbUrl} alt="" className="aspect-[3/2] w-full rounded-card object-cover" />}
      <p className="m-0 text-[15px] text-ink-soft">Elle disparaît aussi du souvenir partagé avec ta tablée. Tu pourras en ajouter une autre.</p>
      {error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-1 flex flex-col gap-2">
        <Button variant="danger" busy={busy} onClick={() => void confirm()}>
          {busy ? 'Suppression…' : 'Supprimer la photo'}
        </Button>
        <Button variant="secondary" onClick={close} disabled={busy}>
          Garder la photo
        </Button>
      </div>
    </Sheet>
  )
  return { ask: (photo: Photo) => setTarget(photo), element }
}
