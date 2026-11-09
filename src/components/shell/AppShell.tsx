import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MiniHeader } from './MiniHeader'
import './shell.css'

/** Page frame: header, centered column with safe areas, bottom navigation. */
export function AppShell({ children, back, hideNav, footer }: { children: ReactNode; back?: boolean | (() => void); hideNav?: boolean; footer?: ReactNode }) {
  const navigate = useNavigate()
  const onBack = back === true ? () => navigate(-1) : typeof back === 'function' ? back : undefined
  const bottomSpace = footer ? 'pb-[calc(96px+var(--safe-bottom))]' : hideNav ? 'pb-[calc(24px+var(--safe-bottom))]' : 'pb-[calc(104px+var(--safe-bottom))]'
  return (
    <>
      <MiniHeader onBack={onBack} />
      <main className={`mx-auto w-full max-w-[560px] px-5 pt-[calc(64px+var(--safe-top))] ${bottomSpace}`}>{children}</main>
      {footer && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg">
          <div className="mx-auto flex w-full max-w-[560px] gap-2.5 px-5 pt-4 pb-[calc(16px+var(--safe-bottom))]">{footer}</div>
        </div>
      )}
      <BottomNav hidden={hideNav || !!footer} />
    </>
  )
}
