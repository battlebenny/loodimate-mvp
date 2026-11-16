import { CalendarDays, List } from 'lucide-react'

export type HomeView = 'list' | 'calendar'

const KEY = 'mate.homeView'

export function readHomeView(): HomeView {
  try {
    return localStorage.getItem(KEY) === 'calendar' ? 'calendar' : 'list'
  } catch {
    return 'list'
  }
}

export function saveHomeView(v: HomeView) {
  try {
    localStorage.setItem(KEY, v)
  } catch {
    // Private mode: the choice just isn't remembered.
  }
}

const OPTIONS = [
  { value: 'list', label: 'Vue liste', Icon: List },
  { value: 'calendar', label: 'Vue calendrier', Icon: CalendarDays },
] as const

/** List / calendar switch, same shape as Loodi-collec's catalog view toggle. */
export function ViewToggle({ value, onChange }: { value: HomeView; onChange: (v: HomeView) => void }) {
  return (
    <div className="flex gap-1 rounded-lg bg-surface-subtle p-0.5" role="group" aria-label="Affichage des parties terminées">
      {OPTIONS.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          aria-label={label}
          className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${value === v ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft'}`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
