import { useEffect, useState, type ReactNode } from 'react'
import { Check, Copy, Ellipsis, EllipsisVertical, Share, SquarePlus } from 'lucide-react'
import { BrandLockup } from '../../components/shell/BrandLockup'
import { Button } from '../../components/ui/Button'
import { getInstallPrompt, onInstallPrompt, type InstallContext } from '../../lib/platform'

type Props = { context: Exclude<InstallContext, 'desktop' | 'installed'>; onSkip: () => void }

const icon = { size: 18, strokeWidth: 2, 'aria-hidden': true, className: 'inline-block align-[-3px]' } as const

function Steps({ children }: { children: ReactNode }) {
  return <ol className="m-0 flex list-none flex-col gap-2.5 p-0">{children}</ol>
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-card bg-surface p-3.5">
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent-strong text-sm font-semibold text-white" aria-hidden="true">
        {n}
      </span>
      <span className="pt-0.5 leading-snug">{children}</span>
    </li>
  )
}

const OpenFromIcon = ({ n }: { n: number }) => (
  <Step n={n}>
    Ouvre <strong>Mate</strong> depuis sa nouvelle icône
  </Step>
)

/** Shown on phones and tablets before onboarding, until the app runs installed. */
export function InstallPage({ context, onSkip }: Props) {
  const [prompt, setPrompt] = useState(getInstallPrompt)
  const [installed, setInstalled] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => onInstallPrompt(() => setPrompt(getInstallPrompt())), [])
  useEffect(() => {
    const done = () => setInstalled(true)
    window.addEventListener('appinstalled', done)
    return () => window.removeEventListener('appinstalled', done)
  }, [])

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    setPrompt(null)
    if (outcome === 'accepted') setInstalled(true)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/')
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const inApp = context === 'in-app'
  const title = installed ? 'Mate est installé' : inApp ? 'Ouvre Mate dans ton navigateur' : 'Installe Mate sur ton téléphone'
  const intro = installed
    ? 'Ouvre-le depuis son icône sur ton écran d’accueil pour commencer.'
    : inApp
      ? 'Cette application ne permet pas d’installer Mate.'
      : 'Il s’ouvrira comme une app depuis ton écran d’accueil, et tes parties y seront gardées.'

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-6 pt-[calc(32px+var(--safe-area-inset-top))] pb-[calc(32px+var(--safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col justify-center gap-7">
        <BrandLockup scale={1.5} />

        <div className="flex flex-col gap-2.5">
          <h1 className="m-0 page-title">{title}</h1>
          <p className="m-0 text-base text-ink-soft">{intro}</p>
        </div>

        {!installed && context === 'ios' && (
          <Steps>
            <Step n={1}>
              Touche <Share {...icon} /> <strong>Partager</strong> dans la barre du navigateur{' '}
              <span className="text-ink-soft">
                (ou <Ellipsis {...icon} /> puis Partager)
              </span>
            </Step>
            <Step n={2}>
              Choisis <strong>Sur l’écran d’accueil</strong> <SquarePlus {...icon} />
            </Step>
            <OpenFromIcon n={3} />
          </Steps>
        )}

        {!installed && context === 'android' && !prompt && (
          <Steps>
            <Step n={1}>
              Touche <EllipsisVertical {...icon} /> en haut à droite du navigateur
            </Step>
            <Step n={2}>
              Choisis <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>
            </Step>
            <OpenFromIcon n={3} />
          </Steps>
        )}

        {!installed && context === 'android' && prompt && (
          <p className="m-0 rounded-card bg-surface p-3.5 leading-snug">Un appui suffit : ton navigateur ajoute l’icône Mate à ton écran d’accueil.</p>
        )}

        {inApp && (
          <Steps>
            <Step n={1}>
              Touche <Ellipsis {...icon} /> en haut de l’écran
            </Step>
            <Step n={2}>
              Choisis <strong>Ouvrir dans le navigateur</strong> (Safari ou Chrome)
            </Step>
          </Steps>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {!installed && context === 'android' && prompt && (
          <Button className="w-full" onClick={() => void install()}>
            Installer Mate
          </Button>
        )}
        {inApp && (
          <Button variant="secondary" className="w-full" onClick={() => void copyLink()}>
            {copied ? <Check size={18} strokeWidth={2} aria-hidden="true" /> : <Copy size={18} strokeWidth={2} aria-hidden="true" />}
            {copied ? 'Lien copié' : 'Copier le lien'}
          </Button>
        )}
        <button type="button" className="min-h-[44px] text-sm font-semibold text-accent-text underline-offset-2 hover:underline" onClick={onSkip}>
          {inApp ? 'Continuer ici quand même' : 'Continuer dans le navigateur'}
        </button>
      </div>
    </main>
  )
}
