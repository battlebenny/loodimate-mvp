import { useEffect, useState } from 'react'
import { BrandLockup } from './BrandLockup'
import { IconBack } from './icons'

/** Loodi header: brand lockup (back button replaces the logo); glass appears on scroll. */
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
      <BrandLockup
        leading={
          onBack && (
            <button type="button" className="mate-header__back" onClick={onBack} aria-label="Retour">
              <IconBack />
            </button>
          )
        }
      />
    </header>
  )
}
