import { useEffect, useState } from 'react'
import { MiniHeader as LoodiMiniHeader } from '@loodi/ui/mini-header'
import '@loodi/ui/mini-header.css'

const noop = () => {}

/** Shared Loodi header (consumed as is from @loodi/ui): Mate has no accounts nor settings, so actions are hidden. */
export function MiniHeader({ onBack }: { onBack?: () => void }) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => setProgress(Math.min(1, window.scrollY / 24))
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <LoodiMiniHeader
      appName="Mate"
      showBack={!!onBack}
      onBack={onBack}
      hideActions
      onSettings={noop}
      onUser={noop}
      scrollProgress={progress}
    />
  )
}
