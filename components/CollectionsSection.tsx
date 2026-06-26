'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BOOKS } from '@/lib/books'

const C = {
  ink: '#1a1814', ink2: '#4a4640', ink3: '#8a8480',
  paper: '#faf9f6', paper2: '#f0ede6', paper3: '#e4e0d8',
  gold: '#b8860b', goldLt: '#f5ecd0',
  serif: "'EB Garamond', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
}

interface Collection {
  id: string
  title: string
  description?: string
  is_public: boolean
  created_at: string
  bookCount?: number
  books?: number[]
}

interface Props {
  userId: string | null
  onAuthRequired: () => void
  compact?: boolean // for homepage sidebar
}

export default function CollectionsSection({ userId, onAuthRequired, compact = false }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (userId) loadCollections() }, [userId])

  async function loadCollections() {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('collections')
      .select('*, collection_books(book_n)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      setCollections(data.map((c: any) => ({
        ...c,
        bookCount: c.collection_books?.length || 0,
        books: c.collection_books?.map((b: any) => b.book_n) || [],
      })))
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!userId) { onAuthRequired(); return }
    if (!title.trim() || submitting) return
    setSubmitting(true)
    const { data } = await supabase.from('collections')
      .insert({ user_id: userId, title: title.trim(), description: desc.trim() || null, is_public: isPublic })
      .select().single()
    if (data) {
      setCollections(prev => [{ ...data, bookCount: 0, books: [] }, ...prev])
      setTitle(''); setDesc(''); setCreating(false)
    }
    setSubmitting(false)
  }

  if (!userId) {
    return (
      <div style={{ padding: '1.5rem', background: C.paper2, borderRadius: 12, border: `1px dashed ${C.paper3}`, textAlign: 'center' }}>
        <p style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink3, margin: '0 0 10px', fontStyle: 'italic' }}>Создавай личные подборки книг</p>
        <button onClick={onAuthRequired} style={{ fontSize: 13, color: C.gold, background: 'none', border: `1px solid ${C.gold}`, borderRadius: 20, padding: '5px 16px', cursor: 'pointer', fontFamily: C.sans }}>Войти</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: C.serif, fontSize: compact ? '1.1rem' : '1.4rem', fontWeight: 400, color: C.ink, margin: 0 }}>
          Мои подборки
        </h2>
        <button onClick={() => setCreating(c => !c)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `1px solid ${C.paper3}`, background: creating ? C.ink : '#fff', color: creating ? C.goldLt : C.ink2, cursor: 'pointer', fontFamily: C.sans }}>
          {creating ? '× Отмена' : '+ Создать'}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{ padding: '1rem', background: C.paper2, borderRadius: 10, border: `1px solid ${C.paper3}`, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название подборки" maxLength={60}
              style={{ padding: '8px 12px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 14, color: C.ink, outline: 'none', background: '#fff' }} />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Описание (необязательно)" rows={2}
              style={{ padding: '8px 12px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.ink, outline: 'none', background: '#fff', resize: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: C.ink2, fontFamily: C.sans }}>
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                Публичная подборка
              </label>
              <button onClick={handleCreate} disabled={!title.trim() || submitting}
                style={{ padding: '7px 16px', borderRadius: 8, background: C.ink, color: C.goldLt, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: C.sans, opacity: !title.trim() ? 0.5 : 1 }}>
                {submitting ? '...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collections list */}
      {loading ? (
        <p style={{ color: C.ink3, fontFamily: C.sans, fontSize: 13 }}>Загружаем…</p>
      ) : collections.length === 0 ? (
        <div style={{ padding: '1.25rem', background: C.paper2, borderRadius: 10, border: `1px dashed ${C.paper3}`, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: C.ink3, margin: 0, fontStyle: 'italic', fontFamily: C.sans }}>Подборок пока нет</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {collections.slice(0, compact ? 3 : undefined).map(col => (
            <CollectionCard key={col.id} collection={col} userId={userId} onUpdate={loadCollections} compact={compact} />
          ))}
        </div>
      )}
    </div>
  )
}

function CollectionCard({ collection, userId, onUpdate, compact }: { collection: Collection; userId: string; onUpdate: () => void; compact: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [addingBook, setAddingBook] = useState(false)
  const [bookQuery, setBookQuery] = useState('')

  const matchedBooks = bookQuery.length > 1
    ? BOOKS.filter(b => b.t.toLowerCase().includes(bookQuery.toLowerCase()) || b.a.toLowerCase().includes(bookQuery.toLowerCase())).slice(0, 5)
    : []

  const addBook = async (bookN: number) => {
    await supabase.from('collection_books').upsert({ collection_id: collection.id, book_n: bookN }, { onConflict: 'collection_id,book_n' })
    setBookQuery(''); setAddingBook(false); onUpdate()
  }

  const removeBook = async (bookN: number) => {
    await supabase.from('collection_books').delete().eq('collection_id', collection.id).eq('book_n', bookN)
    onUpdate()
  }

  const previewBooks = (collection.books || []).slice(0, 3).map(n => BOOKS.find(b => b.n === n)).filter(Boolean) as typeof BOOKS

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, cursor: !compact ? 'pointer' : 'default' }} onClick={() => !compact && setExpanded(e => !e)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontFamily: C.serif, fontSize: 15, fontWeight: 500, color: C.ink }}>{collection.title}</span>
            {!collection.is_public && <span style={{ fontSize: 10, color: C.ink3, background: C.paper2, padding: '1px 6px', borderRadius: 8, fontFamily: C.sans }}>приватная</span>}
          </div>
          {collection.description && <p style={{ fontSize: 12, color: C.ink2, margin: 0, fontFamily: C.sans }}>{collection.description}</p>}
          <p style={{ fontSize: 11, color: C.ink3, margin: '4px 0 0', fontFamily: C.sans }}>{collection.bookCount} {collection.bookCount === 1 ? 'книга' : collection.bookCount! < 5 ? 'книги' : 'книг'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {collection.is_public && (
            <a href={`/philos-next/collection?id=${collection.id}`} title="Открыть страницу подборки"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', border: `1px solid ${C.paper3}`, color: C.ink3, textDecoration: 'none' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </a>
          )}
          {previewBooks.length > 0 && (
            <div style={{ display: 'flex', gap: 2 }}>
              {previewBooks.map(b => (
                <div key={b.n} style={{ width: 28, height: 40, borderRadius: 3, background: `hsl(${[...b.a].reduce((a,c)=>a+c.charCodeAt(0),0)%360},30%,35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, color: '#fff', fontFamily: C.serif }}>{b.t[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {expanded && !compact && (
        <div style={{ borderTop: `1px solid ${C.paper3}`, padding: '10px 14px' }}>
          {/* Book list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {(collection.books || []).map(n => {
              const book = BOOKS.find(b => b.n === n)
              if (!book) return null
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <Link href={`/book/${n}`} style={{ flex: 1, fontFamily: C.sans, fontSize: 13, color: C.ink, textDecoration: 'none' }}>
                    {book.t} <span style={{ color: C.ink3 }}>— {book.a}</span>
                  </Link>
                  <button onClick={() => removeBook(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
                </div>
              )
            })}
          </div>

          {/* Add book */}
          {addingBook ? (
            <div style={{ position: 'relative' }}>
              <input value={bookQuery} onChange={e => setBookQuery(e.target.value)} placeholder="Поиск книги…" autoFocus
                style={{ width: '100%', padding: '7px 12px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.ink, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
              {matchedBooks.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, marginTop: 4 }}>
                  {matchedBooks.map(b => (
                    <button key={b.n} onClick={() => addBook(b.n)} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: C.sans, fontSize: 13, color: C.ink, display: 'block' }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.paper2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      {b.t} — <span style={{ color: C.ink3 }}>{b.a}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setAddingBook(true)} style={{ fontSize: 12, color: C.gold, background: 'none', border: `1px dashed ${C.gold}`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: C.sans }}>
              + Добавить книгу
            </button>
          )}
        </div>
      )}
    </div>
  )
}
