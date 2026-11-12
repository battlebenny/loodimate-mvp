export function WinnerPicker({ players, winners, onChange }: { players: { id: string; name: string }[]; winners: string[]; onChange: (w: string[]) => void }) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-[15px] font-semibold">
        Qui a gagné ? <span className="font-normal text-ink-soft">Coche plusieurs joueurs en cas d’égalité.</span>
      </legend>
      {players.map((p) => {
        const on = winners.includes(p.id)
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? winners.filter((w) => w !== p.id) : [...winners, p.id])}
            className={`flex min-h-[60px] w-full items-center gap-3 rounded-[14px] border-[1.5px] bg-surface px-4 text-left ${on ? 'border-accent-strong' : 'border-line'}`}
          >
            <span aria-hidden className={`flex size-[22px] shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-accent-strong bg-accent-strong text-white' : 'border-ink-soft text-transparent'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
            <span className="text-[17px] font-semibold">{p.name}</span>
          </button>
        )
      })}
    </fieldset>
  )
}
