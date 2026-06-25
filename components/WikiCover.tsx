'use client'
import { useState, useEffect } from 'react'

interface WikiCoverProps {
  title: string
  author: string
  year: string
  size?: number
  className?: string
}

// Initials fallback
function Initials({ author, year, className = '' }: { author: string; year: string; className?: string }) {
  const words = author.split(/[\s·]+/).filter(Boolean)
  const initials = words.slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const hue = [...author].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div
      className={`flex flex-col items-center justify-center text-white ${className}`}
      style={{ background: `hsl(${hue},35%,32%)` }}
    >
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, opacity: 0.9 }}>
        {initials}
      </span>
      <span style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: 4, letterSpacing: '0.06em' }}>
        {year}
      </span>
    </div>
  )
}

export default function WikiCover({ title, author, year, size = 120, className = '' }: WikiCoverProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchCover() {
      // Try Russian Wikipedia first, then English
      const queries = [
        `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title + ' ' + author.split(' ').slice(-1)[0])}`,
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      ]

      for (const url of queries) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
          if (!res.ok) continue
          const data = await res.json()
          const thumb = data?.thumbnail?.source || data?.originalimage?.source
          if (thumb && !cancelled) {
            setImgUrl(thumb)
            return
          }
        } catch {
          // try next
        }
      }

      if (!cancelled) setError(true)
    }

    fetchCover()
    return () => { cancelled = true }
  }, [title, author])

  const style = { width: size, height: Math.round(size * 1.4), flexShrink: 0 }

  if (error || (!imgUrl && !loaded)) {
    // Show initials while loading or on error
    return (
      <Initials
        author={author}
        year={year}
        className={`rounded overflow-hidden ${className}`}
        // @ts-ignore
        style={style}
      />
    )
  }

  return (
    <div
      className={`relative overflow-hidden rounded ${className}`}
      style={{ ...style, background: '#e8e4db' }}
    >
      {imgUrl && (
        <img
          src={imgUrl}
          alt={`Обложка: ${title}`}
          className="w-full h-full object-cover"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
      {!loaded && !error && (
        <Initials author={author} year={year} className="absolute inset-0" />
      )}
    </div>
  )
}
