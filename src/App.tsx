import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { WelcomePage } from './features/onboarding/WelcomePage'
import { AppShell } from './components/shell/AppShell'
import { NewPartyPage } from './features/new-party/NewPartyPage'
import { PlayerContext } from './app/PlayerContext'
import { api, ApiError } from './lib/api'
import { clearPlayer, getDeviceId, getPlayer, setIdentity } from './lib/device'
import type { PlayerDTO } from '../shared/types'

type Gate = { state: 'loading' } | { state: 'welcome' } | { state: 'ready'; player: PlayerDTO }

function Placeholder({ title, hideNav }: { title: string; hideNav?: boolean }) {
  return (
    <AppShell hideNav={hideNav} back={hideNav}>
      <h1 className="font-display text-[26px] font-semibold">{title}</h1>
    </AppShell>
  )
}

function OnboardedApp() {
  const [gate, setGate] = useState<Gate>(() => {
    const cached = getPlayer()
    if (cached) return { state: 'ready', player: cached }
    return { state: getDeviceId() ? 'loading' : 'welcome' }
  })

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
        } else if (!getPlayer()) {
          setGate({ state: 'welcome' })
        }
      })
  }, [])

  if (gate.state === 'loading') return null
  if (gate.state === 'welcome') return <WelcomePage onDone={(player) => setGate({ state: 'ready', player })} />
  return (
    <PlayerContext.Provider value={gate.player}>
      <Routes>
        <Route path="/" element={<Placeholder title={`Salut ${gate.player.name}`} />} />
        <Route path="/nouvelle" element={<NewPartyPage />} />
        <Route path="/partie/:id/feuille" element={<Placeholder title="Feuille de score" hideNav />} />
        <Route path="/partie/:id" element={<Placeholder title="Souvenir" />} />
        <Route path="/stats" element={<Placeholder title="Mes statistiques" />} />
        <Route path="*" element={<Placeholder title="Page introuvable" />} />
      </Routes>
    </PlayerContext.Provider>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/s/:token" element={<Placeholder title="Souvenir partagé" />} />
      <Route path="*" element={<OnboardedApp />} />
    </Routes>
  )
}
