import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { AppShell } from '../../components/shell/AppShell'
import { api } from '../../lib/api'
import { track } from '../../lib/track'
import { usePhotoUpload } from '../sheet/PhotoButton'
import { EditResultSheet } from './EditResultSheet'
import { HighlightSheet } from './HighlightSheet'
import { ShareSheet } from './ShareSheet'
import { SouvenirView } from './SouvenirView'
import type { PartyDTO, Scores } from '../../../shared/types'

export function SouvenirPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { party?: PartyDTO } | null
  const [party, setParty] = useState<PartyDTO | null>(state?.party?.id === id ? state.party : null)
  const [error, setError] = useState<string>()
  const [sheet, setSheet] = useState<'edit' | 'highlight' | 'share' | null>(null)
  // Party id already counted for this display: guards re-renders (souvenir edits) and the StrictMode double effect.
  const tracked = useRef<string | null>(null)

  useEffect(() => {
    if (party) return
    api<PartyDTO>('GET', `parties/${id}`)
      .then(setParty)
      .catch((e) => setError(e instanceof Error ? e.message : 'Souvenir introuvable.'))
  }, [id, party])

  // One souvenir_ouvert per display, once the finished party is shown: right after "Terminer"
  // (the first opening) and from Home > finished parties. An ongoing party redirects to its sheet instead.
  const shownId = party?.status === 'terminée' ? party.id : null
  useEffect(() => {
    if (!shownId || tracked.current === shownId) return
    tracked.current = shownId
    track('souvenir_ouvert', { origin: 'app', partyId: shownId })
  }, [shownId])

  const photos = usePhotoUpload(id, setParty)

  const patch = async (body: { scores?: Record<string, Scores>; winners?: string[]; highlight?: string }) => {
    setParty(await api<PartyDTO>('PATCH', `parties/${id}/souvenir`, body))
  }

  if (error) {
    return (
      <AppShell back={() => navigate('/')}>
        <p role="alert" className="text-danger">
          {error}
        </p>
      </AppShell>
    )
  }
  if (!party) return <div className="h-[340px] animate-pulse bg-surface-subtle" />
  if (party.status === 'en cours') return <Navigate to={`/partie/${id}/feuille`} replace state={{ party }} />

  const shareUrl = `${window.location.origin}/s/${party.shareToken}`
  return (
    <>
      {photos.element}
      <SouvenirView
        party={party}
        mode="owner"
        topLeft={
          <button type="button" onClick={() => navigate('/')} aria-label="Retour à l’accueil" className="loodi-mini-header__icon-button text-ink">
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        }
        onEdit={() => setSheet('edit')}
        onEditHighlight={() => setSheet('highlight')}
        onAddPhoto={photos.pick}
        photoBusy={photos.busy}
      />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg">
        <div className="mx-auto flex max-w-[560px] flex-col gap-2 px-5 pt-4 pb-[calc(16px+var(--safe-area-inset-bottom))]">
          {photos.error && (
            <p role="alert" className="m-0 text-sm text-danger">
              {photos.error}
            </p>
          )}
          <Button className="w-full" onClick={() => setSheet('share')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v13M7 8l5-5 5 5M5 14v6h14v-6" />
            </svg>
            Partager le souvenir
          </Button>
        </div>
      </div>
      <div className="h-24" />
      <EditResultSheet party={party} open={sheet === 'edit'} onClose={() => setSheet(null)} onSave={(p) => patch(p)} />
      <HighlightSheet open={sheet === 'highlight'} value={party.highlight} onClose={() => setSheet(null)} onSave={(text) => patch({ highlight: text })} />
      <ShareSheet open={sheet === 'share'} onClose={() => setSheet(null)} url={shareUrl} gameName={party.game.name} partyId={id} />
    </>
  )
}
