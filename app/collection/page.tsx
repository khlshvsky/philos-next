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

  // ── all state at top ──────────────────────────────────────────────
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  // share / copy
  const [shared, setShared] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  // note editing
  const [editingNote, setEditingNote] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')
  // meta editing (title/desc)
  const [editingMeta, setEditingMeta] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)
  // book adding
  const [addingBook, setAddingBook] = useState(false)
  const [bookQuery, setBookQuery] = useState('')
  const [pendingBooks, setPendingBooks] = useState<number[]>([])
  const [savingBooks, setSavingBooks] = useState(false)

  // ── derived ───────────────────────────────────────────────────────
  const matchedBooks = bookQuery.length > 1
    ? BOOKS.filter(b =>
        !collection?.books.some(cb => cb.book_n === b.n) &&
        !pendingBooks.includes(b.n) &&
        (b.t.toLowerCase().includes(bookQuery.toLowerCase()) || b.a.toLowerCase().includes(bookQuery.toLowerCase()))
      ).slice(0, 6)
    : []

  // ── effects ───────────────────────────────────────────────────────
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id') || window.location.hash.slice(1)
    if (!id) { setNotFound(true); setLoading(false); return }
    loadCollection(id)
  }, [])

  // ── functions ─────────────────────────────────────────────────────
  async function loadCollection(id: string) {
    const { data, error } = await supabase
      .from('collections')
      .select('*, profiles(username, avatar_url), collection_books(book_n, note, position)')
      .eq('id', id)
      .single()
    if (error || !data) { setNotFound(true); setLoading(false); return }
    const currentUser = (await supabase.auth.getUser()).data.user
    if (!data.is_public && data.user_id !== currentUser?.id) { setNotFound(true); setLoading(false); return }
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

  const saveMeta = async () => {
    if (!collection || !editTitle.trim()) return
    setSavingMeta(true)
    await supabase.from('collections').update({ title: editTitle.trim(), description: editDesc.trim() || null }).eq('id', collection.id)
    setCollection(prev => prev ? { ...prev, title: editTitle.trim(), description: editDesc.trim() || undefined } : null)
    setEditingMeta(false); setSavingMeta(false)
  }

  const saveNote = async (bookN: number) => {
    if (!collection) return
    await supabase.from('collection_books').update({ note: noteText.trim() || null }).eq('collection_id', collection.id).eq('book_n', bookN)
    setCollection(prev => prev ? { ...prev, books: prev.books.map(b => b.book_n === bookN ? { ...b, note: noteText.trim() || undefined } : b) } : null)
    setEditingNote(null)
  }

  const saveNewBooks = async () => {
    if (!collection || !pendingBooks.length) return
    setSavingBooks(true)
    const existing = collection.books.length
    await supabase.from('collection_books').upsert(
      pendingBooks.map((n, i) => ({ collection_id: collection.id, book_n: n, position: existing + i })),
      { onConflict: 'collection_id,book_n' }
    )
    const { data } = await supabase.from('collections')
      .select('*, profiles(username, avatar_url), collection_books(book_n, note, position)')
      .eq('id', collection.id).single()
    if (data) {
      const books = (data.collection_books || []).sort((a: CollectionBook, b: CollectionBook) => a.position - b.position)
      setCollection({ ...data, books })
    }
    setPendingBooks([]); setAddingBook(false); setBookQuery(''); setSavingBooks(false)
  }

  const removeBook = async (bookN: number) => {
    if (!collection) return
    await supabase.from('collection_books').delete().eq('collection_id', collection.id).eq('book_n', bookN)
    setCollection(prev => prev ? { ...prev, books: prev.books.filter(b => b.book_n !== bookN) } : null)
  }

  // ── render ────────────────────────────────────────────────────────
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
        {!collection.is_public && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: C.sans, background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: 20 }}>приватная</span>}
      </nav>

      {/* Hero */}
      <div style={{ background: '#141210', padding: '2.5rem 1.5rem 2rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: `hsl(${[...username].reduce((a,c)=>a+c.charCodeAt(0),0)%360},35%,40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {collection.profiles?.avatar_url ? <img src={collection.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: C.sans }}>{username[0].toUpperCase()}</span>}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: C.sans }}>Подборка от <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{username}</strong></span>
          </div>

          {/* Title — editable for owner */}
          {editingMeta ? (
            <div style={{ marginBottom: '1rem' }}>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '10px 14px', fontFamily: C.serif, fontSize: 'clamp(1.4rem,3vw,2rem)', color: '#fff', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} placeholder="Описание…"
                style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 14px', fontFamily: C.sans, fontSize: 14, color: 'rgba(255,255,255,0.8)', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={saveMeta} disabled={savingMeta || !editTitle.trim()} style={{ padding: '7px 18px', borderRadius: 8, background: C.gold, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: C.sans, fontSize: 13, fontWeight: 600 }}>
                  {savingMeta ? '...' : 'Сохранить'}
                </button>
                <button onClick={() => setEditingMeta(false)} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontFamily: C.sans, fontSize: 13 }}>Отмена</button>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: C.serif, fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 700, color: '#fff', lineHeight: 1.15, margin: '0 0 0.75rem' }}>
                {collection.title}
                {isOwner && (
                  <button onClick={() => { setEditTitle(collection.title); setEditDesc(collection.description || ''); setEditingMeta(true) }}
                    style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', verticalAlign: 'middle' }} title="Редактировать">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                )}
              </h1>
              {collection.description && <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', fontFamily: C.sans, margin: '0 0 1rem', lineHeight: 1.6, maxWidth: 600 }}>{collection.description}</p>}
            </>
          )}

          {/* Tags */}
          {collection.tags && collection.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
              {collection.tags.map(t => <span key={t} style={{ fontSize: 12, color: C.gold, background: 'rgba(184,134,11,0.15)', border: '1px solid rgba(184,134,11,0.3)', padding: '2px 10px', borderRadius: 20, fontFamily: C.sans }}>#{t}</span>)}
            </div>
          )}

          {/* Stats + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: C.sans }}>{collection.books.length} книг · ~{totalHours} часов чтения</span>
            <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: shared ? C.gold : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13, fontFamily: C.sans }}>
              {shared ? <><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="2,7 6,11 12,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Скопировано</> : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Поделиться</>}
            </button>
            {!isOwner && user && (
              <button onClick={copyToSelf} disabled={copying} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1px solid ${C.gold}`, background: copied ? C.gold : 'transparent', color: copied ? '#fff' : C.gold, cursor: 'pointer', fontSize: 13, fontFamily: C.sans }}>
                {copied ? '✓ Добавлено' : copying ? '...' : '+ Добавить себе'}
              </button>
            )}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        {/* Owner: add books */}
        {isOwner && (
          <div style={{ marginBottom: '1.5rem' }}>
            {!addingBook ? (
              <button onClick={() => setAddingBook(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: `1px dashed ${C.gold}`, background: 'transparent', color: C.gold, cursor: 'pointer', fontFamily: C.sans, fontSize: 13 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Добавить книги
              </button>
            ) : (
              <div style={{ padding: '1rem', background: C.paper2, borderRadius: 10, border: `1px solid ${C.paper3}` }}>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <input value={bookQuery} onChange={e => setBookQuery(e.target.value)} autoFocus placeholder="Поиск по названию или автору…"
                    style={{ width: '100%', padding: '9px 14px', border: `1px solid ${C.gold}`, borderRadius: 8, fontFamily: C.sans, fontSize: 14, color: C.ink, outline: 'none', background: '#fff', boxSizing: 'border-box', boxShadow: '0 0 0 3px rgba(184,134,11,0.1)' }} />
                  {matchedBooks.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, marginTop: 4, maxHeight: 240, overflowY: 'auto' }}>
                      {matchedBooks.map(b => (
                        <button key={b.n} onClick={() => { setPendingBooks(prev => [...prev, b.n]); setBookQuery('') }}
                          style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', borderBottom: `1px solid ${C.paper3}`, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
                          onMouseEnter={e => (e.currentTarget.style.background = C.goldLt)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          <span style={{ fontFamily: C.serif, fontSize: 14, color: C.ink }}>{b.t}</span>
                          <span style={{ fontSize: 12, color: C.ink3, fontFamily: C.sans }}>— {b.a}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {pendingBooks.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 11, color: C.gold, fontFamily: C.sans, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Выбрано для добавления:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {pendingBooks.map(n => {
                        const book = BOOKS.find(b => b.n === n)
                        if (!book) return null
                        return (
                          <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: C.goldLt, border: `1px solid ${C.gold}`, color: C.ink, borderRadius: 20, padding: '3px 10px', fontFamily: C.sans, fontSize: 12 }}>
                            {book.t}
                            <button onClick={() => setPendingBooks(p => p.filter(x => x !== n))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  {pendingBooks.length > 0 && (
                    <button onClick={saveNewBooks} disabled={savingBooks} style={{ padding: '8px 18px', borderRadius: 8, background: C.gold, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: C.sans, fontSize: 13, fontWeight: 600 }}>
                      {savingBooks ? 'Сохраняем…' : `Сохранить (${pendingBooks.length})`}
                    </button>
                  )}
                  <button onClick={() => { setAddingBook(false); setPendingBooks([]); setBookQuery('') }} style={{ padding: '8px 14px', borderRadius: 8, background: 'none', border: `1px solid ${C.paper3}`, color: C.ink3, cursor: 'pointer', fontFamily: C.sans, fontSize: 13 }}>Отмена</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Book list */}
        {collection.books.length === 0 ? (
          <div style={{ padding: '2rem', background: C.paper2, borderRadius: 12, textAlign: 'center' }}>
            <p style={{ color: C.ink3, fontFamily: C.sans, fontStyle: 'italic', margin: 0 }}>
              {isOwner ? 'Нажми «Добавить книги» чтобы наполнить подборку' : 'В подборке пока нет книг'}
            </p>
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
                  <span style={{ fontFamily: C.serif, fontSize: '1.5rem', color: C.ink3, minWidth: 28, paddingTop: 4, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flexShrink: 0 }}>
                    <WikiCover title={book.t} author={book.a} year={book.y} size={72} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/book/${cb.book_n}`} style={{ textDecoration: 'none' }}>
                      <h3 style={{ fontFamily: C.serif, fontSize: 17, fontWeight: 500, color: C.ink, margin: '0 0 3px', lineHeight: 1.3 }}>{book.t}</h3>
                    </Link>
                    <p style={{ fontSize: 13, color: C.ink3, margin: '0 0 8px', fontFamily: C.sans }}>{book.a} · {book.y}</p>
                    {editingNote === cb.book_n ? (
                      <div>
                        <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2} autoFocus placeholder="Заметка к книге…"
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
