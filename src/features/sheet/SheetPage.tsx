import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/shell/AppShell'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { api } from '../../lib/api'
import { clearDraft, loadDraft, resizeRounds, saveDraft } from '../../lib/draft'
import { createQueue } from '../../lib/queue'
import { computeTotal, isEmptyResult } from '../../../shared/scoring'
import type { PartyDTO, SheetInput, Template } from '../../../shared/types'
import { ScoreBlock } from './ScoreBlock'
import { WinnerPicker } from './WinnerPicker'
import { PhotoButton, usePhotoUpload } from './PhotoButton'
import { usePhotoRemoval } from './PhotoRemoval'

function fromParty(p: PartyDTO): SheetInput {
  const base: SheetInput = {
    template: p.template,
    rounds: p.rounds,
    scores: Object.fromEntries(p.players.map((x) => [x.participationId, x.scores])),
    winners: p.players.filter((x) => x.winner).map((x) => x.participationId),
  }
  const draft = loadDraft(p.id)
  const merged = draft ? { ...base, ...draft, scores: { ...base.scores, ...draft.scores } } : base
  return resizeRounds(merged, merged.rounds)
}

export function SheetPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const initial = (location.state as { party?: PartyDTO } | null)?.party
  const [party, setParty] = useState<PartyDTO | null>(initial?.id === id ? initial : null)
  const [sheet, setSheet] = useState<SheetInput | null>(party ? fromParty(party) : null)
  const [error, setError] = useState<string>()
  const [finishing, setFinishing] = useState(false)
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet
  // Saves and "Terminer" go through one queue so a late save never overwrites the finish.
  const queue = useMemo(createQueue, [])

  useEffect(() => {
    if (party) return
    api<PartyDTO>('GET', `parties/${id}`)
      .then((p) => {
        setParty(p)
        setSheet(fromParty(p))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Partie introuvable.'))
  }, [id, party])

  const sync = useCallback(
    (s: SheetInput | null = sheetRef.current, keepalive = false) => {
      if (!s) return Promise.resolve()
      return queue(() => api('PUT', `parties/${id}/sheet`, s, { keepalive })).catch(() => {})
    },
    [id, queue],
  )

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && void sync(undefined, true)
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [sync])

  const update = (next: SheetInput, syncNow = false) => {
    setSheet(next)
    saveDraft(id, next)
    if (syncNow) void sync(next)
  }

  const photos = usePhotoUpload(id, setParty)
  const removal = usePhotoRemoval(id, setParty)

  if (party?.status === 'terminée') return <Navigate to={`/partie/${id}`} replace />
  if (error) {
    return (
      <AppShell back={() => navigate('/')}>
        <p role="alert" className="text-danger">
          {error}
        </p>
      </AppShell>
    )
  }
  if (!party || !sheet) {
    return (
      <AppShell back={() => navigate('/')} hideNav>
        <div className="h-8 w-40 animate-pulse rounded bg-surface-subtle" />
      </AppShell>
    )
  }

  const players = party.players.map((p) => ({ id: p.participationId, name: p.name }))
  const isScore = sheet.template === 'scores par manche'
  const totals = players.map((p) => computeTotal(sheet.scores[p.id] ?? []))

  async function finish(force = false) {
    if (!sheet || finishing) return
    if (!force && isEmptyResult(sheet.template, totals, sheet.template === 'vainqueur seulement' ? sheet.winners : [])) {
      setConfirmEmpty(true)
      return
    }
    setConfirmEmpty(false)
    setFinishing(true)
    setError(undefined)
    try {
      const payload = { ...sheet, winners: isScore ? [] : sheet.winners }
      const done = await queue(() => api<PartyDTO>('POST', `parties/${id}/finish`, payload))
      clearDraft(id)
      navigate(`/partie/${id}`, { replace: true, state: { party: done } })
    } catch (e) {
      setFinishing(false)
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Réessaie dans un instant.')
    }
  }

  const setTemplate = (t: Template) => t !== sheet.template && update({ ...sheet, template: t }, true)

  return (
    <AppShell
      back={() => {
        void sync()
        navigate('/')
      }}
      footer={
        <div className="flex w-full flex-col gap-2">
          {(photos.error || error) && (
            <p role="alert" className="m-0 text-sm text-danger">
              {photos.error ?? error}
            </p>
          )}
          {party.photos.length > 0 && (
            <ul className="m-0 flex list-none gap-3 p-0 pt-1.5" aria-label="Photos de la partie">
              {party.photos.map((ph, i) => (
                <li key={ph.id} className="relative">
                  <img src={ph.thumbUrl} alt={`Photo ${i + 1}`} className="size-12 rounded-control object-cover" />
                  {/* Delete badge (destructive: danger color, trash icon as on the souvenir); ::after widens the touch target. */}
                  <button
                    type="button"
                    onClick={() => removal.ask(ph)}
                    aria-label={`Supprimer la photo ${i + 1}`}
                    className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-danger/80 text-white ring-2 ring-bg backdrop-blur-sm transition-colors after:absolute after:-inset-2 hover:bg-danger active:bg-danger"
                  >
                    <Trash2 size={13} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2.5">
            <PhotoButton count={party.photos.length} busy={photos.busy} onPick={photos.pick} />
            <Button className="grow" busy={finishing} onClick={() => void finish()}>
              {finishing ? 'Enregistrement…' : 'Terminer la partie'}
            </Button>
          </div>
        </div>
      }
    >
      {photos.element}
      {removal.element}
      <div className="mb-3 flex flex-col">
        <h1 className="m-0 page-title">{party.game.name}</h1>
        <span className="text-[13px] text-ink-soft">Sauvegarde automatique</span>
      </div>

      <div className="flex gap-1 rounded-control bg-surface-subtle p-1" role="group" aria-label="Type de feuille">
        {(['scores par manche', 'vainqueur seulement'] as Template[]).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={sheet.template === t}
            onClick={() => setTemplate(t)}
            className={`min-h-11 flex-1 rounded-[calc(var(--radius-lg)-4px)] text-sm font-semibold ${sheet.template === t ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft'}`}
          >
            {t === 'scores par manche' ? 'Scores par manche' : 'Vainqueur seulement'}
          </button>
        ))}
      </div>
      <p className="mt-1.5 mb-0 text-center text-xs text-ink-soft">Choix mémorisé pour ce jeu</p>

      {isScore ? (
        <>
          <div className="flex items-center justify-between py-3.5">
            <span className="text-[15px] font-semibold">Manches</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Retirer une manche"
                disabled={sheet.rounds <= 1}
                onClick={() => update(resizeRounds(sheet, sheet.rounds - 1))}
                className="size-11 rounded-control border border-line bg-surface text-xl font-semibold disabled:text-ink-soft/50"
              >
                −
              </button>
              <span className="min-w-6 text-center text-lg font-bold tabular-nums" aria-live="polite">
                {sheet.rounds}
              </span>
              <button type="button" aria-label="Ajouter une manche" onClick={() => update(resizeRounds(sheet, sheet.rounds + 1))} className="size-11 rounded-control border border-line bg-surface text-xl font-semibold">
                +
              </button>
            </div>
          </div>
          {sheet.rounds > 1 && (
            <div className="flex gap-1.5 pr-[56px] pb-2 pl-3" aria-hidden>
              {Array.from({ length: sheet.rounds }, (_, i) => (
                <span key={i} className="min-w-0 flex-1 text-center text-xs font-semibold text-ink-soft">
                  M{i + 1}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <ScoreBlock key={p.id} name={p.name} scores={sheet.scores[p.id] ?? []} onChange={(s) => update({ ...sheet, scores: { ...sheet.scores, [p.id]: s } })} />
            ))}
          </div>
        </>
      ) : (
        <div className="pt-5">
          <WinnerPicker players={players} winners={sheet.winners} onChange={(w) => update({ ...sheet, winners: w })} />
        </div>
      )}

      <ConfirmDialog
        open={confirmEmpty}
        title={isScore ? 'Aucun score saisi' : 'Aucun vainqueur choisi'}
        body="La partie sera enregistrée comme terminée, mais elle ne comptera pas dans les statistiques."
        confirmLabel="Terminer quand même"
        cancelLabel="Revenir à la feuille"
        onConfirm={() => void finish(true)}
        onCancel={() => setConfirmEmpty(false)}
      />
    </AppShell>
  )
}
