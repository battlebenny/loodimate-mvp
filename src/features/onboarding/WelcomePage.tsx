import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { Logo } from '../../components/ui/Logo'
import { api, ApiError } from '../../lib/api'
import { ensureDeviceId, isIosSafariNotInstalled, setIdentity } from '../../lib/device'
import type { PlayerDTO } from '../../../shared/types'

type Conflict = { code: 'claimable' | 'taken'; name: string } | null

export function WelcomePage({ onDone }: { onDone: (p: PlayerDTO) => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [conflict, setConflict] = useState<Conflict>(null)
  const [installHint, setInstallHint] = useState(isIosSafariNotInstalled())

  async function submit(mode: 'new' | 'claim' | 'link') {
    const deviceId = ensureDeviceId()
    setBusy(true)
    setError(undefined)
    try {
      const player = await api<PlayerDTO>('POST', 'players/onboard', { firstName: name, mode })
      setIdentity(deviceId, player)
      onDone(player)
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'claimable' || e.code === 'taken')) setConflict({ code: e.code, name: name.trim() })
      else setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (name.trim()) void submit('new')
  }

  function addInitial() {
    setConflict(null)
    setName(`${name.trim()} `)
    setError('Ajoute une initiale pour te distinguer, par exemple « Thomas B. ».')
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-6 pt-[calc(32px+var(--safe-top))] pb-[calc(32px+var(--safe-bottom))]">
      <div className="flex flex-1 flex-col justify-center gap-7">
        <div className="flex items-center gap-3">
          <Logo size={56} />
          <span className="font-display text-2xl font-semibold">Loodi-mate</span>
        </div>

        {installHint && (
          <div className="flex flex-col gap-2 rounded-[18px] border border-line bg-surface p-4">
            <p className="m-0 font-semibold">Installe Loodi-mate sur ton écran d'accueil</p>
            <p className="m-0 text-sm text-ink-soft">
              Touche <span aria-label="Partager">Partager</span> puis « Sur l'écran d'accueil », et ouvre l'app depuis son icône : tes parties y seront gardées.
            </p>
            <button type="button" className="self-start text-sm font-semibold text-accent underline-offset-2 hover:underline min-h-[44px]" onClick={() => setInstallHint(false)}>
              Continuer dans Safari
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <h1 className="m-0 font-display text-[30px] leading-tight font-semibold">Garde la trace de vos parties</h1>
          <p className="m-0 text-base text-ink-soft">Scores, vainqueurs et souvenirs de vos soirées jeux, sans créer de compte.</p>
        </div>

        {conflict ? (
          <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4" role="alertdialog" aria-labelledby="conflict-title">
            <p id="conflict-title" className="m-0 font-semibold">
              {conflict.code === 'claimable' ? `Un·e ${conflict.name} joue déjà dans vos parties. C'est toi ?` : `C'est toi sur un autre appareil ?`}
            </p>
            {conflict.code === 'taken' && <p className="m-0 text-sm text-ink-soft">Par exemple après avoir installé l'app sur ton écran d'accueil.</p>}
            <div className="flex flex-col gap-2">
              <Button busy={busy} onClick={() => void submit(conflict.code === 'claimable' ? 'claim' : 'link')}>
                Oui, c'est moi
              </Button>
              <Button variant="secondary" onClick={addInitial}>
                Non, ajouter une initiale
              </Button>
            </div>
          </div>
        ) : (
          <form id="welcome" onSubmit={onSubmit}>
            <TextField
              label="Ton prénom"
              placeholder="Ex. Benny"
              autoComplete="given-name"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              hint="Il sert à te retrouver dans les parties de ton groupe."
              error={error}
            />
          </form>
        )}
      </div>
      {!conflict && (
        <Button type="submit" form="welcome" busy={busy} disabled={!name.trim()} className="w-full">
          C'est parti
        </Button>
      )}
    </main>
  )
}
