import { brandAssets } from '@loodi/assets'

/** Loodi logo, switching with the theme like Loodi One's header. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex" style={{ width: size, height: size }}>
      <img src={brandAssets.logo} alt="Loodi" width={size} height={size} className="block dark:hidden" />
      <img src={brandAssets.logoDark} alt="" width={size} height={size} className="hidden dark:block" />
    </span>
  )
}
