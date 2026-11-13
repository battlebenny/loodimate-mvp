import { ImagePlus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatLongDate, winnerTitle } from '../../lib/format'
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
  onEdit?: () => void
  onEditHighlight?: () => void
  onAddPhoto?: () => void
  /** Owner only: asks to delete the photo shown in the slideshow. */
  onRemovePhoto?: (photo: PartyDTO['photos'][number]) => void
  photoBusy?: boolean
  banner?: ReactNode
  /** Full-width strip laid over the bottom of the hero (e.g. the owner's preview notice). */
  heroOverlay?: ReactNode
  footer?: ReactNode
}

/**
 * The souvenir: full-width photo, result, ranking and highlight. Reused by the guest view.
 * Laid out like Loodi-collec's game detail (header above, edge-to-edge 3:2 hero, overlay icons),
 * so the page flows under any host header, including Loodi-one's shell.
 */
export function SouvenirView({ party, mode, onEdit, onEditHighlight, onAddPhoto, onRemovePhoto, photoBusy, banner, heroOverlay, footer }: Props) {
  const [cur, setCur] = useState(0)
  const [viewer, setViewer] = useState(false)
  const owner = mode === 'owner'
  const photos = party.photos
  const current = photos[Math.min(cur, Math.max(0, photos.length - 1))]
  const hero = current?.url ?? party.game.image
  const { title, subtitle } = winnerTitle(party)
  const canAdd = owner && photos.length < 3 && onAddPhoto

  // Box art is mostly square with the title on top: anchor it to the top in the 3:2 frame; photos stay centered.
  const heroContent = hero ? (
    <img src={hero} alt={current ? `Photo ${cur + 1} de la partie` : `Boîte de ${party.game.name}`} className={`h-full w-full object-cover ${current ? '' : 'object-top'}`} />
  ) : (
    <span className="flex flex-col items-center gap-2 px-8 text-center text-sm text-ink-soft">
      <ImagePlus size={32} strokeWidth={1.5} aria-hidden="true" />
      {owner ? 'Pas encore de photo · touche pour en ajouter une' : party.game.name}
    </span>
  )

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <div className="relative aspect-[3/2] overflow-hidden bg-surface-subtle">
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
        {canAdd && (hero || photoBusy) && (
          <div className="absolute inset-x-0 top-0 z-10 flex justify-end p-4">
            {/* Overlay icon button, as on Loodi-collec's game detail; the ::after extends the touch target to 44px. */}
            <button
              type="button"
              onClick={onAddPhoto}
              disabled={photoBusy}
              aria-label="Ajouter une photo"
              className="relative flex size-9 items-center justify-center rounded-xl bg-black/40 text-white backdrop-blur-sm after:absolute after:-inset-1 active:bg-black/50"
            >
              {photoBusy ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <ImagePlus size={16} strokeWidth={2.5} aria-hidden="true" />}
            </button>
          </div>
        )}
        {owner && current && onRemovePhoto && (
          <div className="absolute right-0 bottom-0 z-10 p-4">
            {/* Same overlay icon button as "add a photo", at the bottom right of the slideshow. */}
            <button
              type="button"
              onClick={() => onRemovePhoto(current)}
              aria-label={`Supprimer la photo ${cur + 1}`}
              className="relative flex size-9 items-center justify-center rounded-xl bg-black/40 text-white backdrop-blur-sm after:absolute after:-inset-1 active:bg-black/50"
            >
              <Trash2 size={16} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        )}
        {heroOverlay && <div className="absolute inset-x-0 bottom-0 z-10">{heroOverlay}</div>}
      </div>

      <article className="flex flex-col gap-3.5 px-5 pt-4 pb-8">
        {banner}
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <h1 className="m-0 page-title">{party.game.name}</h1>
            <span className="text-[13px] text-ink-soft">
              {formatLongDate(party.finishedAt ?? party.createdAt)} · {party.players.length} joueur{party.players.length > 1 ? 's' : ''}
            </span>
          </div>
          {photos.length > 1 && (
            <div className="flex shrink-0 gap-1.5">
              {photos.map((ph, i) => (
                <button key={ph.url} type="button" onClick={() => setCur(i)} aria-label={`Afficher la photo ${i + 1}`} aria-pressed={i === cur} className={`size-12 overflow-hidden rounded-control border-2 ${i === cur ? 'border-accent' : 'border-transparent'}`}>
                  <img src={ph.thumbUrl} alt="" className={`h-full w-full object-cover ${current ? '' : 'object-top'}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {(() => {
          const inner = (
            <>
              <span className="text-accent-text"><Trophy /></span>
              <span className="flex grow flex-col gap-0.5 text-left">
                <span className="text-[19px] font-bold">{title}</span>
                {subtitle && <span className="text-sm text-ink-soft">{owner || title !== 'Pas de vainqueur' ? subtitle : ''}</span>}
              </span>
              {owner && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-soft" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 20h4L19 9l-4-4L4 16z" />
                </svg>
              )}
            </>
          )
          const cls = 'flex w-full items-center gap-3.5 rounded-card border border-accent/30 bg-accent-soft px-4 py-3.5 text-left text-ink'
          return owner ? (
            <button type="button" className={cls} onClick={onEdit} aria-label={`${title}. Corriger le résultat`}>
              {inner}
            </button>
          ) : (
            <div className={cls}>{inner}</div>
          )
        })()}

        {(party.highlight || owner) && (
          // A quote rather than a second card, so it reads as the story of the game right under the result.
          <section className="flex flex-col gap-1.5 px-1" aria-labelledby="highlight-title">
            <div className="flex items-center justify-between">
              <h2 id="highlight-title" className="m-0 section-label">
                Le fait marquant
              </h2>
              {owner && (
                <button type="button" onClick={onEditHighlight} className="min-h-11 text-sm font-semibold text-accent-text">
                  {party.highlight ? 'Modifier' : 'Ajouter'}
                </button>
              )}
            </div>
            {party.highlight ? (
              <blockquote className="m-0 border-l-2 border-accent pl-3.5 font-display text-lg leading-snug italic">{party.highlight}</blockquote>
            ) : (
              <p className="m-0 border-l-2 border-line pl-3.5 text-[15px] text-ink-soft">Raconte en une phrase ce qui a marqué la partie.</p>
            )}
          </section>
        )}

        {party.template === 'scores par manche' && party.players.some((p) => p.total !== null) && (
          <ol className="m-0 mt-1.5 flex list-none flex-col p-0" aria-label="Classement">
            {rankings(party).map((r) => (
              <li key={r.participationId} className="flex min-h-[38px] items-center gap-3 border-b border-line px-1">
                <span className="w-5 text-sm text-ink-soft">{r.rank}</span>
                <span className="grow text-base font-medium">{r.name}</span>
                <span className="text-base font-semibold tabular-nums">{r.total ?? '–'}</span>
              </li>
            ))}
          </ol>
        )}

        {footer}
      </article>
      {viewer && photos.length > 0 && <PhotoViewer photos={photos} start={cur} onClose={() => setViewer(false)} />}
    </div>
  )
}
