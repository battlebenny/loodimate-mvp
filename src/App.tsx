import { useEffect, useState } from 'react'
import { WelcomePage } from './features/onboarding/WelcomePage'
import { api, ApiError } from './lib/api'
import { clearPlayer, getDeviceId, getPlayer, setIdentity } from './lib/device'
import type { PlayerDTO } from '../shared/types'

type Gate = { state: 'loading' } | { state: 'welcome' } | { state: 'ready'; player: PlayerDTO }

export function App() {
  const [gate, setGate] = useState<Gate>(() => (getPlayer() ? { state: 'ready', player: getPlayer()! } : { state: getDeviceId() ? 'loading' : 'welcome' }))

  useEffect(() => {
    const device = getDeviceId()
    if (!device) return
    api<PlayerDTO>('GET', 'players/me')
      .then((p) => {
        setIdentity(device, p)
        setGate({ state: 'ready', player: p })
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) {
          clearPlayer()
          setGate({ state: 'welcome' })
        }
        // Network errors keep the cached identity.
      })
  }, [])

  if (gate.state === 'loading') return null
  if (gate.state === 'welcome') return <WelcomePage onDone={(player) => setGate({ state: 'ready', player })} />
  return (
    <main className="min-h-dvh p-6">
      <h1 className="font-display text-3xl">Salut {gate.player.name}</h1>
    </main>
  )
}
