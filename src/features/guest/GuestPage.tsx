import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MiniHeader } from '../../components/shell/MiniHeader'
import '../../components/shell/shell.css'
import { api } from '../../lib/api'
import { getLinkVisitorId } from '../../lib/device'
import { track } from '../../lib/track'
import { SouvenirView } from '../souvenir/SouvenirView'
import type { PartyDTO } from '../../../shared/types'

export function GuestPage() {
  const { token = '' } = useParams()
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
        if (!opened.current) {
          opened.current = true
          track('souvenir_ouvert', { origin: 'lien', partyId: p.id, visitorId: getLinkVisitorId() })
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ce souvenir n’existe pas ou plus.'))
  }, [token])

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
  if (!party) return <div className="h-[340px] animate-pulse bg-surface-subtle" />

  return (
    <SouvenirView
      party={party}
      mode="guest"
      banner={<p className="m-0 text-sm text-ink-soft">Souvenir partagé par {party.creatorName}</p>}
      footer={
        <p className="m-0 mt-4 border-t border-line pt-4 text-center text-sm text-ink-soft">
          Toi aussi, garde la trace de tes parties.{' '}
          <Link
            to="/"
            onClick={() => track('cta_clic', { origin: 'lien', partyId: party.id })}
            className="inline-flex min-h-11 items-center font-semibold text-accent-text underline-offset-2 hover:underline"
          >
            Essayer Loodi-mate
          </Link>
        </p>
      }
    />
  )
}
