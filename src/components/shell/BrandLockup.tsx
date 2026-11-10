import './shell.css'
import type { CSSProperties, ReactNode } from 'react'
import { brandAssets } from '@loodi/assets'
import { Logo } from '../ui/Logo'

/**
 * Loodi brand lockup: logo (or a custom leading slot), wordmark and the tilted "Mate" tile.
 * Shared by the MiniHeader and the onboarding page; `scale` enlarges it proportionally.
 */
export function BrandLockup({ scale = 1, leading }: { scale?: number; leading?: ReactNode }) {
  const logoSize = Math.round(36 * scale)
  return (
    <div className="mate-brand" style={{ '--brand-scale': scale } as CSSProperties}>
      <div className="mate-brand__slot">{leading ?? <Logo size={logoSize} />}</div>
      <img src={brandAssets.wordmark} alt="Loodi" className="mate-brand__wordmark mate-brand__wordmark--light" />
      <img src={brandAssets.wordmarkDark} alt="" className="mate-brand__wordmark mate-brand__wordmark--dark" />
      <span className="mate-brand__tile">Mate</span>
    </div>
  )
}
