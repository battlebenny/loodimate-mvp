import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/shell/AppShell'
import { Button } from '../../components/ui/Button'
import { useMe } from '../../app/PlayerContext'
import { api } from '../../lib/api'
import { track } from '../../lib/track'
import { GamePicker, type PickedGame } from './GamePicker'
import { PlayerPicker, type PickedPlayer } from './PlayerPicker'
import type { PartyDTO } from '../../../shared/types'

export function NewPartyPage() {
  const me = useMe()
  const navigate = useNavigate()
  const started = useRef<number | null>(null)
  const [game, setGame] = useState<PickedGame | null>(null)
  const [players, setPlayers] = useState<PickedPlayer[]>([{ name: me.name, playerId: me.id }])
  const [known, setKnown] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (started.current !== null) return
    started.current = performance.now()
    track('creation_debut', { origin: 'app' })
    api<{ names: string[] }>('GET', 'players/known')
      .then((r) => setKnown(r.names))
      .catch(() => {})
  }, [])

  async function create() {
    if (!game || players.length === 0 || busy) return
    setBusy(true)
    setError(undefined)
    const creationSeconds = (performance.now() - (started.current ?? performance.now())) / 1000
    try {
      const party = await api<PartyDTO>('POST', 'parties', {
        game: { bggId: game.bggId, name: game.name, image: game.image },
        players,
        creationSeconds,
      })
      navigate(`/partie/${party.id}/feuille`, { replace: true, state: { party } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Réessaie dans un instant.')
      setBusy(false)
    }
  }

  return (
    <AppShell
      back={() => navigate('/')}
      footer={
        <div className="flex w-full flex-col gap-2">
          {error && (
            <p role="alert" className="m-0 text-sm text-danger">
              {error}
            </p>
          )}
          <Button className="w-full" busy={busy} disabled={!game || players.length === 0} onClick={create}>
            {busy ? 'Création…' : 'Créer la partie'}
          </Button>
        </div>
      }
    >
      <h1 className="m-0 mb-6 page-title">Nouvelle partie</h1>
      <section className="mb-7 flex flex-col gap-2.5" aria-labelledby="np-game">
        <h2 id="np-game" className="m-0 section-label">
          Jeu
        </h2>
        <GamePicker value={game} onChange={setGame} />
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="np-players">
        <h2 id="np-players" className="m-0 section-label">
          Joueurs ({players.length})
        </h2>
        <PlayerPicker players={players} onChange={setPlayers} known={known} />
      </section>
    </AppShell>
  )
}
