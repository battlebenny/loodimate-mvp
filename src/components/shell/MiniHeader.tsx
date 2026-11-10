import { useEffect, useState } from 'react'
import { brandAssets } from '@loodi/assets'
import { Logo } from '../ui/Logo'
import { IconBack } from './icons'

/** Loodi header: logo (or back), wordmark and the "Mate" tile; glass appears on scroll. */
export function MiniHeader({ onBack }: { onBack?: () => void }) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => setProgress(Math.min(1, window.scrollY / 24))
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className="mate-header">
      <div className="mate-header__glass" style={{ opacity: progress }} />
      <div className="mate-header__slot">
        {onBack ? (
          <button type="button" className="mate-header__back" onClick={onBack} aria-label="Retour">
            <IconBack />
          </button>
        ) : (
          <Logo size={36} />
        )}
      </div>
      <img src={brandAssets.wordmark} alt="Loodi" className="mate-header__wordmark mate-header__wordmark--light" />
      <img src={brandAssets.wordmarkDark} alt="" className="mate-header__wordmark mate-header__wordmark--dark" />
      <span className="mate-header__tile">Mate</span>
    </header>
  )
}
