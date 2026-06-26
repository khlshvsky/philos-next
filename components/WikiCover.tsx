'use client'
import { useState, useEffect } from 'react'

interface WikiCoverProps {
  title: string
  author: string
  year: string
  size?: number
}

function Initials({ author, year, w, h }: { author: string; year: string; w: number; h: number }) {
  const words = author.split(/[\s·,]+/).filter(Boolean)
  const initials = words.slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
  const hue = [...author].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: w, height: h, flexShrink: 0, borderRadius: 6,
      background: `hsl(${hue},30%,28%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', overflow: 'hidden',
    }}>
      <span style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: Math.round(w * 0.35), fontWeight: 400, opacity: 0.9, lineHeight: 1 }}>
        {initials}
      </span>
      <span style={{ fontSize: 9, opacity: 0.5, marginTop: 6, letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif' }}>
        {year}
      </span>
    </div>
  )
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
      const queries = [
        `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title + ' ' + author.split(/\s+/).slice(-1)[0])}`,
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      ]
      for (const url of queries) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
          if (!res.ok) continue
          const data = await res.json()
          const thumb = data?.thumbnail?.source
          if (thumb && !cancelled) { setImgUrl(thumb); return }
        } catch {}
      }
      if (!cancelled) setError(true)
    }
    fetchCover()
    return () => { cancelled = true }
  }, [title, author])

  if (error || !imgUrl) {
    return <Initials author={author} year={year} w={w} h={h} />
  }

  return (
    <div style={{
      width: w, height: h, flexShrink: 0, borderRadius: 6,
      overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      background: '#e8e4db', position: 'relative',
    }}>
      {!loaded && <Initials author={author} year={year} w={w} h={h} />}
      <img
        src={imgUrl}
        alt={`Обложка: ${title}`}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s',
          display: 'block',
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  )
}
