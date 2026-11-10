import { createContext, useContext } from 'react'
import type { PlayerDTO } from '../../shared/types'

export const PlayerContext = createContext<PlayerDTO | null>(null)

export function useMe(): PlayerDTO {
  const me = useContext(PlayerContext)
  if (!me) throw new Error('useMe outside of an onboarded app')
  return me
}
