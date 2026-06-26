'use client'
import { useState, useEffect } from 'react'
import { BOOKS } from '@/lib/books'

interface WikiCoverProps {
  title: string
  author: string
  year: string
  size?: number
}

// English title mapping for Open Library search
const EN_TITLES: Record<string, string> = {
  'Государство': 'The Republic',
  'Никомахова этика': 'Nicomachean Ethics',
  'Метафизика': 'Metaphysics',
  'Политика': 'Politics Aristotle',
  'О природе вещей': 'On the Nature of Things',
  'Размышления': 'Meditations Marcus Aurelius',
  'Эннеады': 'Enneads Plotinus',
  'Исповедь': 'Confessions Augustine',
  'О граде Божьем': 'City of God Augustine',
  'Утешение философией': 'Consolation of Philosophy',
  'Сумма теологии': 'Summa Theologica',
  'Государь': 'The Prince Machiavelli',
  'Опыты': 'Essays Montaigne',
  'Левиафан': 'Leviathan Hobbes',
  'Этика': 'Ethics Spinoza',
  'Критика чистого разума': 'Critique of Pure Reason',
  'Феноменология духа': 'Phenomenology of Spirit',
  'Мир как воля и представление': 'World as Will and Representation',
  'Так говорил Заратустра': 'Thus Spoke Zarathustra',
  'По ту сторону добра и зла': 'Beyond Good and Evil',
  'К генеалогии морали': 'Genealogy of Morality',
  'Бытие и время': 'Being and Time',
  'Бытие и ничто': 'Being and Nothingness',
  'Логико-философский трактат': 'Tractatus Logico-Philosophicus',
  'Структура научных революций': 'Structure of Scientific Revolutions',
  'Теория справедливости': 'Theory of Justice Rawls',
  'Восстание масс': 'Revolt of the Masses',
  'Закат Европы': 'Decline of the West',
  'Понятие политического': 'Concept of the Political',
  'Страх и трепет': 'Fear and Trembling',
  'Апология Сократа': 'Apology Plato',
  'Пир': 'Symposium Plato',
  'Федон': 'Phaedo Plato',
  'Менон': 'Meno Plato',
  'Тимей': 'Timaeus Plato',
  'Законы': 'Laws Plato',
}

function Initials({ author, year, w, h }: { author: string; year: string; w: number; h: number }) {
  const words = author.split(/[\s·,]+/).filter(Boolean)
  const initials = words.slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
  const hue = [...author].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div style={{ width: w, height: h, flexShrink: 0, borderRadius: 6, background: `hsl(${hue},30%,28%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', overflow: 'hidden' }}>
      <span style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: Math.round(w * 0.35), fontWeight: 400, opacity: 0.9, lineHeight: 1 }}>{initials}</span>
      <span style={{ fontSize: 9, opacity: 0.5, marginTop: 6, letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif' }}>{year}</span>
    </div>
  )
}

async function fetchOpenLibraryCover(title: string, author: string): Promise<string | null> {
  const enTitle = EN_TITLES[title]
  const query = enTitle || `${title} ${author.split(' ').slice(-1)[0]}`
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=cover_i,title&limit=3`,
      { signal: AbortSignal.timeout(4000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const doc = data.docs?.find((d: any) => d.cover_i)
    if (doc?.cover_i) {
      return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
    }
  } catch {}
  return null
}

async function fetchWikipediaCover(title: string, author: string): Promise<string | null> {
  const queries = [
    `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(EN_TITLES[title] || title)}`,
  ]
  for (const url of queries) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) continue
      const data = await res.json()
      const thumb = data?.thumbnail?.source
      if (thumb) return thumb
    } catch {}
  }
  return null
}

export default function WikiCover({ title, author, year, size = 120 }: WikiCoverProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const w = size
  const h = Math.round(size * 1.4)

  useEffect(() => {
    let cancelled = false
    async function fetchCover() {
      // Try Open Library first (actual book covers)
      const olUrl = await fetchOpenLibraryCover(title, author)
      if (olUrl && !cancelled) { setImgUrl(olUrl); return }

      // Fall back to Wikipedia
      const wikiUrl = await fetchWikipediaCover(title, author)
      if (wikiUrl && !cancelled) { setImgUrl(wikiUrl); return }

      if (!cancelled) setError(true)
    }
    fetchCover()
    return () => { cancelled = true }
  }, [title, author])

  if (error) return <Initials author={author} year={year} w={w} h={h} />

  return (
    <div style={{ width: w, height: h, flexShrink: 0, borderRadius: 6, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', background: '#e8e4db', position: 'relative' }}>
      {!loaded && <Initials author={author} year={year} w={w} h={h} />}
      {imgUrl && (
        <img
          src={imgUrl}
          alt={`Обложка: ${title}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s', display: 'block' }}
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true) }}
        />
      )}
    </div>
  )
}
