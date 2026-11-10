/** Where the app runs, as far as installing it as a PWA is concerned. */
export type InstallContext = 'desktop' | 'installed' | 'ios' | 'android' | 'in-app'

type Env = { ua: string; touchPoints: number; standalone: boolean }

// Embedded browsers of social and messaging apps, which cannot install a PWA.
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Messenger|WhatsApp|Snapchat|LinkedInApp|TikTok|musical_ly|Line\/|MicroMessenger|Twitter|; wv\)/

export function installContext({ ua, touchPoints, standalone }: Env): InstallContext {
  if (standalone) return 'installed'
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && touchPoints > 1)
  const android = /Android/.test(ua)
  if (!ios && !android) return 'desktop'
  if (IN_APP.test(ua)) return 'in-app'
  return ios ? 'ios' : 'android'
}

export function currentInstallContext(): InstallContext {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  return installContext({ ua: navigator.userAgent, touchPoints: navigator.maxTouchPoints ?? 0, standalone })
}

/** Chrome's deferred install prompt (Android); not in the TS DOM lib. */
export type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferredPrompt: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

/** Must run before the first render: Chrome fires `beforeinstallprompt` early, once. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as InstallPromptEvent
    listeners.forEach((l) => l())
  })
}

export function getInstallPrompt(): InstallPromptEvent | null {
  return deferredPrompt
}

export function onInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const SKIP = 'mate.installSkipped'

/** "Continue in the browser" lasts for this browsing session only. */
export function isInstallSkipped(): boolean {
  try {
    return sessionStorage.getItem(SKIP) === '1'
  } catch {
    return false
  }
}

export function skipInstall() {
  try {
    sessionStorage.setItem(SKIP, '1')
  } catch {
    /* storage unavailable: the screen comes back on reload */
  }
}
