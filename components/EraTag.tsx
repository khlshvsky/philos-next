import { ERA_META } from '@/lib/books'

interface EraTagProps {
  era: string
  small?: boolean
}

export default function EraTag({ era, small = false }: EraTagProps) {
  const meta = ERA_META[era as keyof typeof ERA_META]
  if (!meta) return null
  return (
    <span
      className="inline-block rounded-full font-medium"
      style={{
        background: meta.bg,
        color: meta.color,
        fontSize: small ? '10px' : '11px',
        padding: small ? '1px 7px' : '2px 9px',
        letterSpacing: '0.02em',
      }}
    >
      {era}
    </span>
  )
}
