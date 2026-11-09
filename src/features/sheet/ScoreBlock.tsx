import { useEffect, useState } from 'react'
import { computeTotal } from '../../../shared/scoring'
import type { Scores } from '../../../shared/types'

function parse(text: string): number | null {
  const t = text.trim()
  return /^-?\d+$/.test(t) ? Number(t) : null
}

function ScoreCell({ value, label, onChange, onFocus }: { value: number | null; label: string; onChange: (v: number | null) => void; onFocus: () => void }) {
  const [text, setText] = useState(value === null ? '' : String(value))
  // Resync when the value changes from outside (± button, draft restore).
  useEffect(() => {
    if (parse(text) !== value) setText(value === null ? '' : String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <input
      type="text"
      inputMode="numeric"
      enterKeyHint="next"
      autoComplete="off"
      aria-label={label}
      placeholder="–"
      value={text}
      onFocus={(e) => {
        onFocus()
        e.currentTarget.select()
      }}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '').slice(0, 6)
        setText(t)
        onChange(parse(t))
      }}
      className="h-[46px] min-w-0 flex-1 rounded-[10px] border-[1.5px] border-line bg-surface text-center text-[17px] font-semibold text-ink outline-none focus:border-accent"
    />
  )
}

export function ScoreBlock({ name, scores, onChange }: { name: string; scores: Scores; onChange: (s: Scores) => void }) {
  const [last, setLast] = useState<number | null>(null)
  const total = computeTotal(scores)
  const flip = () => {
    const i = last ?? scores.findLastIndex((v) => v !== null)
    if (i < 0 || scores[i] === null || scores[i] === undefined) return
    onChange(scores.map((v, j) => (j === i && v !== null ? -v : v)))
  }
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] border border-line bg-surface px-3 pt-2.5 pb-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[15px] font-semibold">{name}</span>
        <span className="text-lg font-bold tabular-nums" aria-label={`Total de ${name}`}>
          {total ?? 0}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {scores.map((v, i) => (
          <ScoreCell
            key={i}
            value={v}
            label={`Score de ${name}, manche ${i + 1}`}
            onFocus={() => setLast(i)}
            onChange={(nv) => onChange(scores.map((x, j) => (j === i ? nv : x)))}
          />
        ))}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={flip}
          aria-label={`Inverser le signe du dernier score de ${name}`}
          className="flex h-[46px] w-11 shrink-0 items-center justify-center rounded-[10px] border border-line text-lg font-semibold text-ink-soft hover:bg-surface-subtle"
        >
          ±
        </button>
      </div>
    </div>
  )
}
