import { Eye } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '../../components/ui/Sheet'
import { track } from '../../lib/track'

const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v13M7 8l5-5 5 5M5 14v6h14v-6" />
  </svg>
)

export function ShareSheet({ open, onClose, url, previewPath, gameName, partyId }: { open: boolean; onClose: () => void; url: string; previewPath: string; gameName: string; partyId: string }) {
  const [feedback, setFeedback] = useState('')
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const done = (msg: string) => {
    setFeedback(msg)
    track('lien_partage', { origin: 'app', partyId })
  }
  async function native() {
    try {
      await navigator.share({ title: `${gameName} · souvenir Loodi-mate`, text: `Le souvenir de notre partie de ${gameName}`, url })
      done('Partagé !')
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setFeedback("Le partage n’a pas fonctionné, copie plutôt le lien.")
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      done('Lien copié')
    } catch {
      setFeedback(`Copie impossible. Le lien : ${url}`)
    }
  }
  const btn = 'flex min-h-14 w-full items-center gap-3 rounded-control border border-line bg-surface px-4 text-left text-base font-medium hover:bg-surface-subtle'
  return (
    <Sheet
      open={open}
      title="Partager avec ta tablée"
      onClose={() => {
        setFeedback('')
        onClose()
      }}
    >
      <p className="m-0 mb-1.5 text-sm text-ink-soft">Toute personne qui a le lien voit le souvenir, sans compte et sans pouvoir le modifier.</p>
      {canShare && (
        <button type="button" className={btn} onClick={native}>
          <ShareIcon />
          Envoyer par WhatsApp, SMS…
        </button>
      )}
      <button type="button" className={btn} onClick={copy}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" />
        </svg>
        Copier le lien
      </button>
      {/* Preview of the guest view; ?apercu keeps it out of the souvenir_ouvert / cta_clic measures. */}
      <Link to={previewPath} className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-accent-text">
        <Eye size={18} strokeWidth={2} aria-hidden="true" />
        Voir ce que reçoit ta tablée
      </Link>
      <p className="m-0 min-h-5 text-sm font-semibold text-success-text" aria-live="polite">
        {feedback}
      </p>
    </Sheet>
  )
}
