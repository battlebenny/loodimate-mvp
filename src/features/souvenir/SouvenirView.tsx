import { useState, type ReactNode } from 'react'
import { formatLongDate, winnerTitle } from '../../lib/format'
import { CameraIcon } from '../sheet/PhotoButton'
import { PhotoViewer } from './PhotoViewer'
import type { PartyDTO } from '../../../shared/types'

const Trophy = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 6h3v2a3 3 0 01-3 3M7 6H4v2a3 3 0 003 3" />
  </svg>
)

function rankings(p: PartyDTO) {
  const sorted = [...p.players].sort((a, b) => (b.total ?? -Infinity) - (a.total ?? -Infinity))
  return sorted.map((x, i) => ({ ...x, rank: i > 0 && sorted[i - 1]!.total === x.total ? sorted.findIndex((y) => y.total === x.total) + 1 : i + 1 }))
}

type Props = {
  party: PartyDTO
  mode: 'owner' | 'guest'
  topLeft?: ReactNode
  onEdit?: () => void
  onEditHighlight?: () => void
  onAddPhoto?: () => void
  photoBusy?: boolean
  banner?: ReactNode
}

/** The souvenir: immersive photo, result, ranking and highlight. Reused by the guest view. */
export function SouvenirView({ party, mode, topLeft, onEdit, onEditHighlight, onAddPhoto, photoBusy, banner }: Props) {
  const [cur, setCur] = useState(0)
  const [viewer, setViewer] = useState(false)
  const owner = mode === 'owner'
  const photos = party.photos
  const current = photos[Math.min(cur, Math.max(0, photos.length - 1))]
  const hero = current?.url ?? party.game.image
  const { title, subtitle } = winnerTitle(party)
  const canAdd = owner && photos.length < 3 && onAddPhoto

  const heroContent = hero ? (
    <img src={hero} alt={current ? `Photo ${cur + 1} de la partie` : `Boîte de ${party.game.name}`} className={`h-full w-full ${current ? 'object-cover' : 'object-contain p-6'}`} />
  ) : (
    <span className="px-8 text-center text-sm text-ink-soft">{owner ? 'Pas encore de photo · touche pour en ajouter une' : party.game.name}</span>
  )

  return (
    <div className="relative min-h-dvh">
      <div className="fixed inset-x-0 top-0 mx-auto h-[min(340px,48dvh)] max-w-[560px] overflow-hidden bg-surface-subtle">
        {current ? (
          <button type="button" className="flex h-full w-full cursor-zoom-in items-center justify-center" onClick={() => setViewer(true)} aria-label="Voir la photo en plein écran">
            {heroContent}
          </button>
        ) : canAdd ? (
          <button type="button" className="flex h-full w-full items-center justify-center" onClick={onAddPhoto} aria-label="Ajouter une photo">
            {heroContent}
          </button>
        ) : (
          <div className="flex h-full w-full items-center justify-center">{heroContent}</div>
        )}
      </div>
      <div className="fixed inset-x-0 top-0 z-20 mx-auto flex max-w-[560px] justify-between px-4 pt-[calc(16px+var(--safe-top))]">
        {topLeft ?? <span />}
        {canAdd && (
          <button type="button" onClick={onAddPhoto} disabled={photoBusy} aria-label="Ajouter une photo" className="flex size-11 items-center justify-center rounded-full bg-white/92 text-[#1c1b19] shadow-sm">
            {photoBusy ? <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <CameraIcon />}
          </button>
        )}
      </div>

      <article className="relative z-10 mx-auto mt-[calc(min(340px,48dvh)-36px)] flex min-h-[60dvh] max-w-[560px] flex-col gap-3.5 rounded-t-3xl bg-bg px-5 pt-5 pb-8">
        {banner}
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <h1 className="m-0 font-display text-[26px] leading-tight font-semibold">{party.game.name}</h1>
            <span className="text-[13px] text-ink-soft">
              {formatLongDate(party.finishedAt ?? party.createdAt)} · {party.players.length} joueur{party.players.length > 1 ? 's' : ''}
            </span>
          </div>
          {photos.length > 1 && (
            <div className="flex shrink-0 gap-1.5">
              {photos.map((ph, i) => (
                <button key={ph.url} type="button" onClick={() => setCur(i)} aria-label={`Afficher la photo ${i + 1}`} aria-pressed={i === cur} className={`size-[52px] overflow-hidden rounded-[10px] border-2 ${i === cur ? 'border-ink' : 'border-transparent'}`}>
                  <img src={ph.thumbUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {(() => {
          const inner = (
            <>
              <Trophy />
              <span className="flex grow flex-col gap-0.5 text-left">
                <span className="text-[19px] font-bold">{title}</span>
                {subtitle && <span className="text-sm opacity-80">{owner || title !== 'Pas de vainqueur' ? subtitle : ''}</span>}
              </span>
              {owner && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 20h4L19 9l-4-4L4 16z" />
                </svg>
              )}
            </>
          )
          const cls = 'flex w-full items-center gap-3.5 rounded-2xl bg-accent-strong px-4 py-3.5 text-white'
          return owner ? (
            <button type="button" className={cls} onClick={onEdit} aria-label={`${title}. Corriger le résultat`}>
              {inner}
            </button>
          ) : (
            <div className={cls}>{inner}</div>
          )
        })()}

        {party.template === 'scores par manche' && party.players.some((p) => p.total !== null) && (
          <ol className="m-0 flex list-none flex-col p-0" aria-label="Classement">
            {rankings(party).map((r) => (
              <li key={r.participationId} className="flex min-h-[38px] items-center gap-3 border-b border-line px-1">
                <span className="w-5 text-sm text-ink-soft">{r.rank}</span>
                <span className="grow text-base font-medium">{r.name}</span>
                <span className="text-base font-semibold tabular-nums">{r.total ?? '–'}</span>
              </li>
            ))}
          </ol>
        )}

        {(party.highlight || owner) && (
          <section className="flex flex-col gap-1 rounded-[14px] border border-line bg-surface px-4 py-3" aria-labelledby="highlight-title">
            <div className="flex items-center justify-between">
              <h2 id="highlight-title" className="m-0 text-xs font-semibold tracking-[0.06em] text-ink-soft uppercase">
                Le fait marquant
              </h2>
              {owner && (
                <button type="button" onClick={onEditHighlight} className="min-h-11 text-sm font-semibold text-accent-strong">
                  {party.highlight ? 'Modifier' : 'Ajouter'}
                </button>
              )}
            </div>
            <p className="m-0 text-[15px] leading-relaxed">{party.highlight ?? <span className="text-ink-soft">Ajouter un fait marquant</span>}</p>
          </section>
        )}
      </article>
      {viewer && photos.length > 0 && <PhotoViewer photos={photos} start={cur} onClose={() => setViewer(false)} />}
    </div>
  )
}
