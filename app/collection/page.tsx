'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BOOKS } from '@/lib/books'
import WikiCover from '@/components/WikiCover'
import { useUser } from '@/lib/useUser'

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
  is_public: boolean; created_at: string; user_id: string
  profiles: { username: string; avatar_url?: string }
  books: CollectionBook[]
  tags?: string[]
}

export default function CollectionPage() {
  const { user } = useUser()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [shared, setShared] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  // For owner: inline editing
  const [editingNote, setEditingNote] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id') || window.location.hash.slice(1)
    if (!id) { setNotFound(true); setLoading(false); return }
    loadCollection(id)
  }, [])

  async function loadCollection(id: string) {
    const { data, error } = await supabase
      .from('collections')
      .select('*, profiles(username, avatar_url), collection_books(book_n, note, position)')
      .eq('id', id)
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

  const copyToSelf = async () => {
    if (!user || !collection) return
    setCopying(true)
    const { data: newCol } = await supabase.from('collections')
      .insert({ user_id: user.id, title: `${collection.title} (копия)`, description: collection.description, is_public: false })
      .select().single()
    if (newCol && collection.books.length) {
      await supabase.from('collection_books').insert(
        collection.books.map((cb, i) => ({ collection_id: newCol.id, book_n: cb.book_n, position: i }))
      )
    }
    setCopying(false); setCopied(true); setTimeout(() => setCopied(false), 3000)
  }

  const saveNote = async (bookN: number) => {
    if (!collection) return
    await supabase.from('collection_books').update({ note: noteText.trim() || null })
      .eq('collection_id', collection.id).eq('book_n', bookN)
    setCollection(prev => prev ? {
      ...prev,
      books: prev.books.map(b => b.book_n === bookN ? { ...b, note: noteText.trim() || undefined } : b)
    } : null)
    setEditingNote(null)
  }

  const removeBook = async (bookN: number) => {
    if (!collection) return
    await supabase.from('collection_books').delete().eq('collection_id', collection.id).eq('book_n', bookN)
    setCollection(prev => prev ? { ...prev, books: prev.books.filter(b => b.book_n !== bookN), } : null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.ink3, fontFamily: C.sans }}>Загружаем…</p>
    </div>
  )

  if (notFound || !collection) return (
    <div style={{ minHeight: '100vh', background: C.paper, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ fontFamily: C.serif, fontSize: '1.5rem', color: C.ink2 }}>Подборка не найдена</p>
      <p style={{ fontFamily: C.sans, fontSize: 14, color: C.ink3 }}>Возможно, она приватная или была удалена</p>
      <Link href="/" style={{ color: C.gold, fontFamily: C.sans, fontSize: 14 }}>← На главную</Link>
    </div>
  )

  const isOwner = user?.id === collection.user_id
  const username = collection.profiles?.username || 'Читатель'
  const totalHours = collection.books.reduce((s, cb) => s + (BOOKS.find(b => b.n === cb.book_n)?.h || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: C.paper }}>
      {/* Nav */}
      <nav style={{ background: '#141210', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.gold, fontSize: 13, textDecoration: 'none', fontWeight: 500, fontFamily: C.sans }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Философский канон
        </Link>
        {!collection.is_public && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: C.sans, background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: 20 }}>приватная</span>
        )}
      </nav>

      {/* Hero */}
      <div style={{ background: '#141210', padding: '2.5rem 1.5rem 2rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: `hsl(${[...username].reduce((a,c)=>a+c.charCodeAt(0),0)%360},35%,40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {collection.profiles?.avatar_url
                ? <img src={collection.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                : <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: C.sans }}>{username[0].toUpperCase()}</span>}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: C.sans }}>
              Подборка от <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{username}</strong>
            </span>
          </div>

          <h1 style={{ fontFamily: C.serif, fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 700, color: '#fff', lineHeight: 1.15, margin: '0 0 0.75rem' }}>
            {collection.title}
          </h1>
          {collection.description && (
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', fontFamily: C.sans, margin: '0 0 1rem', lineHeight: 1.6, maxWidth: 600 }}>{collection.description}</p>
          )}

          {/* Tags */}
          {collection.tags && collection.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
              {collection.tags.map(t => (
                <span key={t} style={{ fontSize: 12, color: C.gold, background: 'rgba(184,134,11,0.15)', border: '1px solid rgba(184,134,11,0.3)', padding: '2px 10px', borderRadius: 20, fontFamily: C.sans }}>#{t}</span>
              ))}
            </div>
          )}

          {/* Stats + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: C.sans }}>
              {collection.books.length} {collection.books.length === 1 ? 'книга' : collection.books.length < 5 ? 'книги' : 'книг'} · ~{totalHours} часов чтения
            </span>

            {/* Share */}
            <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: shared ? C.gold : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13, fontFamily: C.sans, transition: 'all 0.15s' }}>
              {shared
                ? <><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="2,7 6,11 12,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Скопировано</>
                : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Поделиться</>}
            </button>

            {/* Copy to self (non-owner) */}
            {!isOwner && user && (
              <button onClick={copyToSelf} disabled={copying} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1px solid ${C.gold}`, background: copied ? C.gold : 'transparent', color: copied ? '#fff' : C.gold, cursor: 'pointer', fontSize: 13, fontFamily: C.sans, transition: 'all 0.15s' }}>
                {copied ? '✓ Добавлено к вам' : copying ? '...' : '+ Добавить себе'}
              </button>
            )}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        {collection.books.length === 0 ? (
          <div style={{ padding: '2rem', background: C.paper2, borderRadius: 12, textAlign: 'center' }}>
            <p style={{ color: C.ink3, fontFamily: C.sans, fontStyle: 'italic', margin: 0 }}>В подборке пока нет книг</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {collection.books.map((cb, i) => {
              const book = BOOKS.find(b => b.n === cb.book_n)
              if (!book) return null
              return (
                <div key={cb.book_n} style={{ display: 'flex', gap: '1.25rem', padding: '1.25rem', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 12, alignItems: 'flex-start', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.paper3)}>

                  {/* Number */}
                  <span style={{ fontFamily: C.serif, fontSize: '1.5rem', color: C.ink3, fontWeight: 400, minWidth: 28, paddingTop: 4, flexShrink: 0 }}>{i + 1}</span>

                  {/* Cover */}
                  <div style={{ flexShrink: 0 }}>
                    <WikiCover title={book.t} author={book.a} year={book.y} size={72} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/book/${cb.book_n}`} style={{ textDecoration: 'none' }}>
                      <h3 style={{ fontFamily: C.serif, fontSize: 17, fontWeight: 500, color: C.ink, margin: '0 0 3px', lineHeight: 1.3 }}>{book.t}</h3>
                    </Link>
                    <p style={{ fontSize: 13, color: C.ink3, margin: '0 0 8px', fontFamily: C.sans }}>{book.a} · {book.y}</p>

                    {/* Note */}
                    {editingNote === cb.book_n ? (
                      <div>
                        <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2} autoFocus
                          placeholder="Заметка к книге…"
                          style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.gold}`, borderRadius: 6, fontFamily: C.sans, fontSize: 13, color: C.ink, resize: 'none', outline: 'none', background: '#fff', boxSizing: 'border-box', boxShadow: '0 0 0 3px rgba(184,134,11,0.1)' }} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button onClick={() => saveNote(cb.book_n)} style={{ padding: '5px 14px', borderRadius: 6, background: C.ink, color: C.goldLt, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: C.sans }}>Сохранить</button>
                          <button onClick={() => setEditingNote(null)} style={{ padding: '5px 14px', borderRadius: 6, background: 'none', border: `1px solid ${C.paper3}`, cursor: 'pointer', fontSize: 12, fontFamily: C.sans, color: C.ink3 }}>Отмена</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {cb.note && <p style={{ fontSize: 13, color: C.ink2, margin: 0, fontFamily: C.sans, lineHeight: 1.6, fontStyle: 'italic' }}>"{cb.note}"</p>}
                        {isOwner && (
                          <button onClick={() => { setEditingNote(cb.book_n); setNoteText(cb.note || '') }}
                            style={{ marginTop: 6, fontSize: 11, color: C.ink3, background: 'none', border: 'none', cursor: 'pointer', fontFamily: C.sans, padding: 0, textDecoration: 'underline' }}>
                            {cb.note ? 'Изменить заметку' : '+ Добавить заметку'}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Right: hours + remove */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: C.gold, background: C.goldLt, padding: '2px 9px', borderRadius: 10, fontFamily: C.sans }}>{book.h} ч</span>
                    {isOwner && (
                      <button onClick={() => removeBook(cb.book_n)} title="Убрать из подборки"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Back link */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${C.paper3}` }}>
          <Link href="/library" style={{ fontSize: 13, color: C.gold, textDecoration: 'none', fontFamily: C.sans, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Открыть библиотеку
          </Link>
        </div>
      </main>
    </div>
  )
}
