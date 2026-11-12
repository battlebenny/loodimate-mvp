import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { WelcomePage } from './features/onboarding/WelcomePage'
import { InstallPage } from './features/install/InstallPage'
import { currentInstallContext, isInstallSkipped, skipInstall } from './lib/platform'
import { AppShell } from './components/shell/AppShell'
import { NewPartyPage } from './features/new-party/NewPartyPage'
import { SheetPage } from './features/sheet/SheetPage'
import { SouvenirPage } from './features/souvenir/SouvenirPage'
import { GuestPage } from './features/guest/GuestPage'
import { HomePage } from './features/home/HomePage'
import { StatsPage } from './features/stats/StatsPage'
import { PlayerContext } from './app/PlayerContext'
import { api, ApiError } from './lib/api'
import { clearPlayer, getDeviceId, getPlayer, setDeviceId, setIdentity } from './lib/device'
import { readDemoDevice } from './lib/demo'
import type { PlayerDTO } from '../shared/types'

type Gate = { state: 'loading' } | { state: 'welcome' } | { state: 'ready'; player: PlayerDTO }

function Placeholder({ title, hideNav }: { title: string; hideNav?: boolean }) {
  return (
    <AppShell hideNav={hideNav} back={hideNav}>
      <h1 className="page-title">{title}</h1>
    </AppShell>
  )
}

// Demo switch, applied once before the first render (see docs/demo.md).
const demoDevice = readDemoDevice(window.location.search)
if (demoDevice) {
  setDeviceId(demoDevice)
  clearPlayer()
  window.history.replaceState(null, '', window.location.pathname)
}

function OnboardedApp() {
  const [gate, setGate] = useState<Gate>(() => {
    const cached = getPlayer()
    if (cached) return { state: 'ready', player: cached }
    return { state: getDeviceId() ? 'loading' : 'welcome' }
  })

  // Phones and tablets are invited to install the app before onboarding; desktop goes straight on.
  const [needsInstall, setNeedsInstall] = useState(() => {
    const context = currentInstallContext()
    return context === 'desktop' || context === 'installed' || isInstallSkipped() ? null : context
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
  if (gate.state === 'welcome' && needsInstall) {
    const onSkip = () => {
      skipInstall()
      setNeedsInstall(null)
    }
    return <InstallPage context={needsInstall} onSkip={onSkip} />
  }
  if (gate.state === 'welcome') return <WelcomePage onDone={(player) => setGate({ state: 'ready', player })} />
  return (
    <PlayerContext.Provider value={gate.player}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/nouvelle" element={<NewPartyPage />} />
        <Route path="/partie/:id/feuille" element={<SheetPage />} />
        <Route path="/partie/:id" element={<SouvenirPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="*" element={<Placeholder title="Page introuvable" />} />
      </Routes>
    </PlayerContext.Provider>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/s/:token" element={<GuestPage />} />
      <Route path="*" element={<OnboardedApp />} />
    </Routes>
  )
}
