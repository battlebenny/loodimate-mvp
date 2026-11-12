import { Eye } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MiniHeader } from '../../components/shell/MiniHeader'
import '../../components/shell/shell.css'
import { api } from '../../lib/api'
import { getLinkVisitorId } from '../../lib/device'
import { track } from '../../lib/track'
import { SouvenirView } from '../souvenir/SouvenirView'
import type { PartyDTO } from '../../../shared/types'

export function GuestPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  // Owner preview from the share sheet: same view, but no measurement events and a way back.
  const preview = useSearchParams()[0].has('apercu')
  const [party, setParty] = useState<PartyDTO | null>(null)
  const [error, setError] = useState<string>()
  const opened = useRef(false)

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  useEffect(() => {
    api<PartyDTO>('GET', `shared/${encodeURIComponent(token)}`)
      .then((p) => {
        setParty(p)
        if (!opened.current && !preview) {
          opened.current = true
          track('souvenir_ouvert', { origin: 'lien', partyId: p.id, visitorId: getLinkVisitorId() })
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ce souvenir n’existe pas ou plus.'))
  }, [token, preview])

  if (error) {
    return (
      <>
        <MiniHeader />
        <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-4 px-6">
          <h1 className="m-0 font-display text-2xl font-semibold">Ce souvenir n’existe pas ou plus.</h1>
          <Link to="/" className="font-semibold text-accent-text">
            Découvrir Loodi-mate
          </Link>
        </main>
      </>
    )
  }
  const header = (
    <>
      <MiniHeader onBack={preview ? () => navigate(-1) : undefined} />
      <div className="h-[calc(52px+var(--safe-area-inset-top))]" aria-hidden="true" />
    </>
  )
  if (!party) {
    return (
      <>
        {header}
        <div className="mx-auto aspect-[3/2] max-w-[560px] animate-pulse bg-surface-subtle" />
      </>
    )
  }

  return (
    <>
      {header}
      <SouvenirView
        party={party}
        mode="guest"
        heroOverlay={
          preview && (
            <p
              role="note"
              className="m-0 flex items-center gap-2 border-t border-[var(--color-theme-status-info-border)] bg-[color-mix(in_srgb,var(--color-theme-status-info-surface)_88%,transparent)] px-5 py-2.5 text-sm text-[var(--color-theme-status-info-text)] backdrop-blur-sm"
            >
              <Eye size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
              Aperçu : ce que reçoit ta tablée
            </p>
          )
        }
        banner={<p className="m-0 text-sm text-ink-soft">Souvenir partagé par {party.creatorName}</p>}
        footer={
          <p className="m-0 mt-4 border-t border-line pt-4 text-center text-sm text-ink-soft">
            Toi aussi, garde la trace de tes parties.{' '}
            <Link
              to="/"
              onClick={() => !preview && track('cta_clic', { origin: 'lien', partyId: party.id })}
              className="inline-flex min-h-11 items-center font-semibold text-accent-text underline-offset-2 hover:underline"
            >
              Essayer Loodi-mate
            </Link>
          </p>
        }
      />
    </>
  )
}
