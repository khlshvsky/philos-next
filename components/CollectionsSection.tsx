'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Pencil, Plus } from 'lucide-react'
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
  id: string; title: string; description?: string
  is_public: boolean; created_at: string
  bookCount?: number; books?: number[]; tags?: string[]
  user_id?: string; owner_username?: string
}

interface Props {
  userId: string | null
  onAuthRequired: () => void
  compact?: boolean
}

export default function CollectionsSection({ userId, onAuthRequired, compact = false }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [tagsInput, setTagsInput] = useState('')
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
      setCollections(prev => [{ ...data, bookCount: 0, books: [], tags: tagsInput.split(',').map(t=>t.trim()).filter(Boolean) }, ...prev])
      setTitle(''); setDesc(''); setTagsInput(''); setCreating(false)
    }
    setSubmitting(false)
  }

  if (!userId) return (
    <div style={{ padding: '1.5rem', background: C.paper2, borderRadius: 12, border: `1px dashed ${C.paper3}`, textAlign: 'center' }}>
      <p style={{ fontFamily: C.serif, fontSize: '1rem', color: C.ink3, margin: '0 0 10px', fontStyle: 'italic' }}>Создавай личные подборки книг</p>
      <button onClick={onAuthRequired} style={{ fontSize: 13, color: C.gold, background: 'none', border: `1px solid ${C.gold}`, borderRadius: 20, padding: '5px 16px', cursor: 'pointer', fontFamily: C.sans }}>Войти</button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: C.serif, fontSize: compact ? '1.1rem' : '1.4rem', fontWeight: 400, color: C.ink, margin: 0 }}>Мои подборки</h2>
        <button onClick={() => setCreating(c => !c)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `1px solid ${C.paper3}`, background: creating ? C.ink : '#fff', color: creating ? C.goldLt : C.ink2, cursor: 'pointer', fontFamily: C.sans }}>
          {creating ? '× Отмена' : '+ Создать'}
        </button>
      </div>

      {creating && (
        <div style={{ padding: '1rem', background: C.paper2, borderRadius: 10, border: `1px solid ${C.paper3}`, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название подборки" maxLength={60}
              style={{ padding: '8px 12px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 14, color: C.ink, outline: 'none', background: '#fff' }} />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Описание (необязательно)" rows={2}
              style={{ padding: '8px 12px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.ink, outline: 'none', background: '#fff', resize: 'none' }} />
            <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="Теги через запятую: этика, античность…"
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
            <CollectionCard key={col.id} collection={col} userId={userId} onUpdate={loadCollections} onAuthRequired={onAuthRequired} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── CollectionCard ─────────────────────────────────────────────────
function CollectionCard({ collection, userId, onUpdate, onAuthRequired }: {
  collection: Collection; userId: string; onUpdate: () => void; onAuthRequired: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [bookQuery, setBookQuery] = useState('')
  // Buffer: selected but not yet saved
  const [pending, setPending] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  const isOwner = collection.user_id === userId

  const matchedBooks = bookQuery.length > 1
    ? BOOKS.filter(b =>
        !collection.books?.includes(b.n) &&
        !pending.includes(b.n) &&
        (b.t.toLowerCase().includes(bookQuery.toLowerCase()) || b.a.toLowerCase().includes(bookQuery.toLowerCase()))
      ).slice(0, 6)
    : []

  const addToPending = (bookN: number) => {
    setPending(prev => prev.includes(bookN) ? prev : [...prev, bookN])
    setBookQuery('')
  }

  const removeFromPending = (bookN: number) => {
    setPending(prev => prev.filter(n => n !== bookN))
  }

  const saveBooks = async () => {
    if (!pending.length || saving) return
    setSaving(true)
    const existing = collection.books?.length || 0
    await supabase.from('collection_books').upsert(
      pending.map((n, i) => ({ collection_id: collection.id, book_n: n, position: existing + i })),
      { onConflict: 'collection_id,book_n' }
    )
    setPending([])
    setSaving(false)
    onUpdate()
  }

  const removeBook = async (bookN: number) => {
    await supabase.from('collection_books').delete().eq('collection_id', collection.id).eq('book_n', bookN)
    onUpdate()
  }

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
    <div style={{ background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 10, position: 'relative', transition: 'border-color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = C.paper3)}>

      {/* Header */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          {/* Title — link if public, plain if private */}
          {collection.is_public ? (
            <a href={collectionUrl} style={{ fontFamily: C.serif, fontSize: 15, fontWeight: 500, color: C.ink, textDecoration: 'none', display: 'block', marginBottom: 2 }}>
              {collection.title}
            </a>
          ) : (
            <span style={{ fontFamily: C.serif, fontSize: 15, fontWeight: 500, color: C.ink, display: 'block', marginBottom: 2 }}>
              {collection.title}
              <span style={{ fontSize: 10, color: C.ink3, background: C.paper2, padding: '1px 6px', borderRadius: 8, fontFamily: C.sans, marginLeft: 6 }}>приватная</span>
            </span>
          )}
          {collection.description && <p style={{ fontSize: 12, color: C.ink2, margin: '0 0 4px', fontFamily: C.sans }}>{collection.description}</p>}
          {collection.tags && collection.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
              {collection.tags.map(t => <span key={t} style={{ fontSize: 10, color: C.gold, background: C.goldLt, padding: '1px 7px', borderRadius: 10, fontFamily: C.sans }}>#{t}</span>)}
            </div>
          )}
          <p style={{ fontSize: 11, color: C.ink3, margin: 0, fontFamily: C.sans }}>
            {collection.bookCount} {collection.bookCount === 1 ? 'книга' : collection.bookCount! < 5 ? 'книги' : 'книг'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Copy to self (for others' public collections) */}
          {!isOwner && collection.is_public && (
            <button onClick={copyCollection} disabled={copying} title="Добавить себе"
              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.paper3}`, background: copied ? C.goldLt : '#fff', color: copied ? C.gold : C.ink3, cursor: 'pointer', fontFamily: C.sans }}>
              {copied ? '✓ Добавлено' : copying ? '...' : '+ Себе'}
            </button>
          )}
          {/* Edit toggle for owner */}
          {isOwner && (
            <button onClick={() => setExpanded(x => !x)} title="Редактировать"
              style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${C.paper3}`, background: expanded ? C.ink : '#fff', color: expanded ? C.goldLt : C.ink3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pencil size={12} strokeWidth={2.5} />
            </button>
          )}
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

      {/* Edit panel */}
      {expanded && isOwner && (
        <div style={{ borderTop: `1px solid ${C.paper3}`, padding: '10px 14px', background: C.paper2 }}>
          <p style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Книги в подборке</p>

          {/* Current books */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
            {(collection.books || []).length === 0 && pending.length === 0 && (
              <p style={{ fontSize: 13, color: C.ink3, fontFamily: C.sans, fontStyle: 'italic', margin: 0 }}>Пока пусто — добавь книги ниже</p>
            )}
            {(collection.books || []).map(n => {
              const book = BOOKS.find(b => b.n === n)
              if (!book) return null
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: '#fff', borderRadius: 6 }}>
                  <Link href={`/book/${n}`} style={{ flex: 1, fontFamily: C.sans, fontSize: 13, color: C.ink, textDecoration: 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {book.t} <span style={{ color: C.ink3 }}>— {book.a}</span>
                  </Link>
                  <button onClick={() => removeBook(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
                </div>
              )
            })}

            {/* Pending (not yet saved) */}
            {pending.length > 0 && (
              <>
                <p style={{ fontSize: 10, color: C.gold, fontFamily: C.sans, margin: '6px 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ожидают сохранения:</p>
                {pending.map(n => {
                  const book = BOOKS.find(b => b.n === n)
                  if (!book) return null
                  return (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: C.goldLt, borderRadius: 6, border: `1px dashed ${C.gold}` }}>
                      <span style={{ flex: 1, fontFamily: C.sans, fontSize: 13, color: C.ink, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {book.t} <span style={{ color: C.ink3 }}>— {book.a}</span>
                      </span>
                      <button onClick={() => removeFromPending(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* Search + add to buffer */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input value={bookQuery} onChange={e => setBookQuery(e.target.value)}
              placeholder="Поиск книги для добавления…"
              style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.ink, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
            {matchedBooks.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 500, marginTop: 4, maxHeight: 220, overflowY: 'auto' }}>
                {matchedBooks.map(b => (
                  <button key={b.n} onClick={() => addToPending(b.n)}
                    style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderBottom: `1px solid ${C.paper3}`, cursor: 'pointer', textAlign: 'left', fontFamily: C.sans, fontSize: 13, color: C.ink, display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.goldLt)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <Plus size={12} strokeWidth={2.5} color={C.gold} />
                    <span style={{ fontFamily: C.serif, fontSize: 14 }}>{b.t}</span>
                    <span style={{ color: C.ink3, fontSize: 12 }}>— {b.a}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Save button — appears only when there are pending books */}
          {pending.length > 0 && (
            <button onClick={saveBooks} disabled={saving}
              style={{ width: '100%', padding: '9px', borderRadius: 8, background: C.gold, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: C.sans, fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Сохраняем…' : `Сохранить (${pending.length} ${pending.length === 1 ? 'книга' : pending.length < 5 ? 'книги' : 'книг'})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
