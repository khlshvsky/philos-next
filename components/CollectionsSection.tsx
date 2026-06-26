'use client'
import { useState, useEffect, useRef } from 'react'
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
  tags?: string[]
  owner_username?: string
  user_id?: string
}

interface Props {
  userId: string | null
  onAuthRequired: () => void
  compact?: boolean
  // if set, shows a specific user's public collections (for discovery)
  viewUserId?: string
}

export default function CollectionsSection({ userId, onAuthRequired, compact = false, viewUserId }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const targetUserId = viewUserId || userId

  useEffect(() => { if (targetUserId) loadCollections() }, [targetUserId])

  async function loadCollections() {
    if (!targetUserId) return
    setLoading(true)
    const query = supabase
      .from('collections')
      .select('*, collection_books(book_n), profiles(username)')
      .order('created_at', { ascending: false })

    if (viewUserId) {
      query.eq('user_id', viewUserId).eq('is_public', true)
    } else {
      query.eq('user_id', userId!)
    }

    const { data } = await query
    if (data) {
      setCollections(data.map((c: any) => ({
        ...c,
        bookCount: c.collection_books?.length || 0,
        books: c.collection_books?.map((b: any) => b.book_n) || [],
        owner_username: c.profiles?.username,
      })))
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!userId) { onAuthRequired(); return }
    if (!title.trim() || submitting) return
    setSubmitting(true)
    const tags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    const { data } = await supabase.from('collections')
      .insert({ user_id: userId, title: title.trim(), description: desc.trim() || null, is_public: isPublic })
      .select().single()
    if (data) {
      setCollections(prev => [{ ...data, bookCount: 0, books: [], tags }, ...prev])
      setTitle(''); setDesc(''); setTagsInput(''); setCreating(false)
    }
    setSubmitting(false)
  }

  if (!userId && !viewUserId) {
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
          {viewUserId ? 'Подборки' : 'Мои подборки'}
        </h2>
        {!viewUserId && (
          <button onClick={() => setCreating(c => !c)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `1px solid ${C.paper3}`, background: creating ? C.ink : '#fff', color: creating ? C.goldLt : C.ink2, cursor: 'pointer', fontFamily: C.sans }}>
            {creating ? '× Отмена' : '+ Создать'}
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div style={{ padding: '1rem', background: C.paper2, borderRadius: 10, border: `1px solid ${C.paper3}`, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название подборки" maxLength={60}
              style={{ padding: '8px 12px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 14, color: C.ink, outline: 'none', background: '#fff' }} />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Описание (необязательно)" rows={2}
              style={{ padding: '8px 12px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.ink, outline: 'none', background: '#fff', resize: 'none' }} />
            <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="Теги через запятую: этика, античность, стоицизм"
              style={{ padding: '8px 12px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.ink, outline: 'none', background: '#fff' }} />
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

      {loading ? (
        <p style={{ color: C.ink3, fontFamily: C.sans, fontSize: 13 }}>Загружаем…</p>
      ) : collections.length === 0 ? (
        <div style={{ padding: '1.25rem', background: C.paper2, borderRadius: 10, border: `1px dashed ${C.paper3}`, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: C.ink3, margin: 0, fontStyle: 'italic', fontFamily: C.sans }}>Подборок пока нет</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {collections.slice(0, compact ? 3 : undefined).map(col => (
            <CollectionCard
              key={col.id}
              collection={col}
              userId={userId}
              isOwner={col.user_id === userId || (!viewUserId && !!userId)}
              onUpdate={loadCollections}
              compact={compact}
              onAuthRequired={onAuthRequired}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── CollectionCard ─────────────────────────────────────────────────
function CollectionCard({ collection, userId, isOwner, onUpdate, compact, onAuthRequired }: {
  collection: Collection
  userId: string | null
  isOwner: boolean
  onUpdate: () => void
  compact: boolean
  onAuthRequired: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [addingBook, setAddingBook] = useState(false)
  const [bookQuery, setBookQuery] = useState('')
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const matchedBooks = bookQuery.length > 1
    ? BOOKS.filter(b =>
        !collection.books?.includes(b.n) &&
        (b.t.toLowerCase().includes(bookQuery.toLowerCase()) || b.a.toLowerCase().includes(bookQuery.toLowerCase()))
      ).slice(0, 6)
    : []

  const addBook = async (bookN: number) => {
    await supabase.from('collection_books').upsert(
      { collection_id: collection.id, book_n: bookN, position: (collection.bookCount || 0) },
      { onConflict: 'collection_id,book_n' }
    )
    setBookQuery(''); setAddingBook(false); onUpdate()
  }

  const removeBook = async (bookN: number) => {
    await supabase.from('collection_books').delete().eq('collection_id', collection.id).eq('book_n', bookN)
    onUpdate()
  }

  // Copy (save) a public collection to own account
  const copyCollection = async () => {
    if (!userId) { onAuthRequired(); return }
    setCopying(true)
    const { data: newCol } = await supabase.from('collections')
      .insert({ user_id: userId, title: `${collection.title} (копия)`, description: collection.description, is_public: false })
      .select().single()
    if (newCol && collection.books?.length) {
      await supabase.from('collection_books').insert(
        collection.books.map((n, i) => ({ collection_id: newCol.id, book_n: n, position: i }))
      )
    }
    setCopying(false); setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onUpdate()
  }

  const previewBooks = (collection.books || []).slice(0, 3).map(n => BOOKS.find(b => b.n === n)).filter(Boolean) as typeof BOOKS
  const collectionUrl = `/philos-next/collection?id=${collection.id}`

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = C.paper3)}>

      {/* Header — click opens collection page */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <a href={collection.is_public ? collectionUrl : undefined}
          onClick={e => { if (!collection.is_public) { e.preventDefault(); setExpanded(x => !x) } }}
          style={{ flex: 1, textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontFamily: C.serif, fontSize: 15, fontWeight: 500, color: C.ink }}>{collection.title}</span>
            {!collection.is_public && <span style={{ fontSize: 10, color: C.ink3, background: C.paper2, padding: '1px 6px', borderRadius: 8, fontFamily: C.sans }}>приватная</span>}
          </div>
          {collection.description && <p style={{ fontSize: 12, color: C.ink2, margin: 0, fontFamily: C.sans }}>{collection.description}</p>}

          {/* Tags */}
          {collection.tags && collection.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
              {collection.tags.map(tag => (
                <span key={tag} style={{ fontSize: 10, color: C.gold, background: C.goldLt, padding: '1px 7px', borderRadius: 10, fontFamily: C.sans }}>#{tag}</span>
              ))}
            </div>
          )}

          <p style={{ fontSize: 11, color: C.ink3, margin: '4px 0 0', fontFamily: C.sans }}>
            {collection.bookCount} {collection.bookCount === 1 ? 'книга' : collection.bookCount! < 5 ? 'книги' : 'книг'}
          </p>
        </a>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Copy to own collections (for others' public collections) */}
          {!isOwner && collection.is_public && userId && (
            <button onClick={copyCollection} disabled={copying} title="Добавить себе"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.paper3}`, background: copied ? C.goldLt : '#fff', color: copied ? C.gold : C.ink3, cursor: 'pointer', fontFamily: C.sans }}>
              {copied ? '✓ Добавлено' : copying ? '...' : '+ Себе'}
            </button>
          )}
          {/* Edit/expand for owner */}
          {isOwner && (
            <button onClick={() => setExpanded(x => !x)} title="Редактировать"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', border: `1px solid ${C.paper3}`, background: expanded ? C.ink : '#fff', color: expanded ? C.goldLt : C.ink3, cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          )}
          {/* Preview books */}
          {previewBooks.length > 0 && (
            <div style={{ display: 'flex', gap: 2 }}>
              {previewBooks.map(b => (
                <div key={b.n} style={{ width: 26, height: 38, borderRadius: 3, background: `hsl(${[...b.a].reduce((a,c)=>a+c.charCodeAt(0),0)%360},30%,35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, color: '#fff', fontFamily: C.serif }}>{b.t[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expanded: edit books (owner only) */}
      {expanded && isOwner && (
        <div style={{ borderTop: `1px solid ${C.paper3}`, padding: '10px 14px', background: C.paper2 }}>
          <p style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Книги в подборке</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {(collection.books || []).length === 0 && (
              <p style={{ fontSize: 13, color: C.ink3, fontFamily: C.sans, fontStyle: 'italic', margin: 0 }}>Пока пусто</p>
            )}
            {(collection.books || []).map(n => {
              const book = BOOKS.find(b => b.n === n)
              if (!book) return null
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${C.paper3}` }}>
                  <Link href={`/book/${n}`} style={{ flex: 1, fontFamily: C.sans, fontSize: 13, color: C.ink, textDecoration: 'none' }}>
                    {book.t} <span style={{ color: C.ink3 }}>— {book.a}</span>
                  </Link>
                  <button onClick={() => removeBook(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 16, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}>×</button>
                </div>
              )
            })}
          </div>

          {/* Add book search */}
          {addingBook ? (
            <div style={{ position: 'relative' }}>
              <input ref={inputRef} value={bookQuery} onChange={e => setBookQuery(e.target.value)}
                placeholder="Введи название или автора…" autoFocus
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.gold}`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.ink, outline: 'none', background: '#fff', boxSizing: 'border-box', boxShadow: '0 0 0 3px rgba(184,134,11,0.1)' }} />
              <button onClick={() => { setAddingBook(false); setBookQuery('') }}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 16 }}>×</button>
              {matchedBooks.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, marginTop: 4, maxHeight: 240, overflowY: 'auto' }}>
                  {matchedBooks.map(b => (
                    <button key={b.n} onClick={() => addBook(b.n)}
                      style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderBottom: `1px solid ${C.paper3}`, cursor: 'pointer', textAlign: 'left', fontFamily: C.sans, fontSize: 13, color: C.ink, display: 'flex', alignItems: 'center', gap: 8 }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.paper2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <span style={{ fontFamily: C.serif, fontSize: 14 }}>{b.t}</span>
                      <span style={{ color: C.ink3, fontSize: 12 }}>— {b.a}</span>
                    </button>
                  ))}
                </div>
              )}
              {bookQuery.length > 1 && matchedBooks.length === 0 && (
                <p style={{ fontSize: 12, color: C.ink3, fontFamily: C.sans, margin: '6px 0 0' }}>Ничего не найдено</p>
              )}
            </div>
          ) : (
            <button onClick={() => setAddingBook(true)}
              style={{ fontSize: 12, color: C.gold, background: 'none', border: `1px dashed ${C.gold}`, borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontFamily: C.sans, display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Добавить книгу
            </button>
          )}
        </div>
      )}
    </div>
  )
}
