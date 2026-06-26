'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BOOKS } from '@/lib/books'
import WikiCover from '@/components/WikiCover'

const C = {
  ink: '#1a1814', ink2: '#4a4640', ink3: '#8a8480',
  paper: '#faf9f6', paper2: '#f0ede6', paper3: '#e4e0d8',
  gold: '#b8860b', goldLt: '#f5ecd0',
  serif: "'EB Garamond', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
}

interface CollectionBook { book_n: number; note?: string; position: number }
interface Collection {
  id: string; title: string; description?: string
  is_public: boolean; created_at: string
  profiles: { username: string; avatar_url?: string }
  books: CollectionBook[]
}

export default function CollectionPage() {
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    // Read ID from hash: /collection#<uuid>
    const id = window.location.hash.slice(1) || new URLSearchParams(window.location.search).get('id')
    if (!id) { setNotFound(true); setLoading(false); return }
    loadCollection(id)
  }, [])

  async function loadCollection(id: string) {
    const { data, error } = await supabase
      .from('collections')
      .select('*, profiles(username, avatar_url), collection_books(book_n, note, position)')
      .eq('id', id)
      .eq('is_public', true)
      .single()

    if (error || !data) { setNotFound(true); setLoading(false); return }
    const books = (data.collection_books || []).sort((a: CollectionBook, b: CollectionBook) => a.position - b.position)
    setCollection({ ...data, books })
    setLoading(false)
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) { try { await navigator.share({ title: collection?.title, url }) } catch {} }
    else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2000) }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.ink3, fontFamily: C.sans }}>Загружаем…</p>
    </div>
  )

  if (notFound || !collection) return (
    <div style={{ minHeight: '100vh', background: C.paper, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ fontFamily: C.serif, fontSize: '1.5rem', color: C.ink2 }}>Подборка не найдена</p>
      <Link href="/" style={{ color: C.gold, fontFamily: C.sans, fontSize: 14 }}>← На главную</Link>
    </div>
  )

  const username = collection.profiles?.username || 'Читатель'
  const totalHours = collection.books.reduce((s, cb) => s + (BOOKS.find(b => b.n === cb.book_n)?.h || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: C.paper }}>
      <nav style={{ background: '#141210', padding: '0.75rem 1.5rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.gold, fontSize: 13, textDecoration: 'none', fontWeight: 500, fontFamily: C.sans, width: 'fit-content' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Философский канон
        </Link>
      </nav>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: `hsl(${[...username].reduce((a,c)=>a+c.charCodeAt(0),0)%360},35%,40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {collection.profiles?.avatar_url
                ? <img src={collection.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                : <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: C.sans }}>{username[0].toUpperCase()}</span>}
            </div>
            <span style={{ fontSize: 13, color: C.ink2, fontFamily: C.sans }}>Подборка от <strong>{username}</strong></span>
          </div>
          <h1 style={{ fontFamily: C.serif, fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 700, color: C.ink, lineHeight: 1.2, margin: '0 0 0.5rem' }}>{collection.title}</h1>
          {collection.description && <p style={{ fontSize: 15, color: C.ink2, fontFamily: C.sans, margin: '0 0 1rem', lineHeight: 1.6 }}>{collection.description}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: C.ink3, fontFamily: C.sans }}>{collection.books.length} книг · ~{totalHours} часов</span>
            <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1px solid ${C.paper3}`, background: shared ? C.goldLt : '#fff', color: shared ? C.gold : C.ink2, cursor: 'pointer', fontSize: 13, fontFamily: C.sans }}>
              {shared
                ? <><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="2,7 6,11 12,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Скопировано</>
                : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Поделиться</>}
            </button>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: `1px solid ${C.paper3}`, margin: '0 0 2rem' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {collection.books.map((cb, i) => {
            const book = BOOKS.find(b => b.n === cb.book_n)
            if (!book) return null
            return (
              <Link key={cb.book_n} href={`/book/${cb.book_n}`} style={{ textDecoration: 'none', display: 'flex', gap: '1.25rem', padding: '1rem', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 10, alignItems: 'flex-start', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.paper3)}>
                <span style={{ fontFamily: C.serif, fontSize: '1.4rem', color: C.ink3, minWidth: 24, paddingTop: 2 }}>{i + 1}</span>
                <WikiCover title={book.t} author={book.a} year={book.y} size={60} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontFamily: C.serif, fontSize: 15, fontWeight: 500, color: C.ink, margin: '0 0 2px', lineHeight: 1.3 }}>{book.t}</h3>
                  <p style={{ fontSize: 12, color: C.ink3, margin: '0 0 6px', fontFamily: C.sans }}>{book.a} · {book.y}</p>
                  {cb.note && <p style={{ fontSize: 13, color: C.ink2, margin: 0, fontFamily: C.sans, lineHeight: 1.55, fontStyle: 'italic' }}>{cb.note}</p>}
                </div>
                <span style={{ fontSize: 11, color: C.gold, background: C.goldLt, padding: '2px 8px', borderRadius: 10, fontFamily: C.sans, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>{book.h} ч</span>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
