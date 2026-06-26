'use client'
import { useState } from 'react'

const C = {
  gold: '#b8860b', goldLt: '#f5ecd0',
  ink3: '#8a8480', paper3: '#e4e0d8',
  sans: "'Inter', system-ui, sans-serif",
}

interface Props {
  value: number | null
  onChange: (rating: number) => void
  readonly?: boolean
  size?: number
}

export default function StarRating({ value, onChange, readonly = false, size = 22 }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const active = hover ?? value ?? 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {Array.from({ length: 10 }, (_, i) => {
          const n = i + 1
          const filled = n <= active
          return (
            <button
              key={n}
              onClick={() => !readonly && onChange(n)}
              onMouseEnter={() => !readonly && setHover(n)}
              onMouseLeave={() => !readonly && setHover(null)}
              title={`${n}/10`}
              style={{
                background: 'none', border: 'none', cursor: readonly ? 'default' : 'pointer',
                padding: 1, lineHeight: 1,
                color: filled ? C.gold : C.paper3,
                transition: 'color 0.1s',
              }}
              aria-label={`Оценка ${n}`}
            >
              <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" strokeLinejoin="round"/>
              </svg>
            </button>
          )
        })}
      </div>
      {value !== null && (
        <span style={{ fontSize: 13, color: C.gold, fontWeight: 600, fontFamily: C.sans, marginLeft: 4 }}>
          {value}/10
        </span>
      )}
      {!readonly && value !== null && (
        <button
          onClick={() => onChange(0)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 11, fontFamily: C.sans, padding: '0 4px' }}
          title="Убрать оценку"
        >
          ×
        </button>
      )}
    </div>
  )
}
