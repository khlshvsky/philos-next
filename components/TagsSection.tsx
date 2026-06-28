'use client'
import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import DiscussionTree from './DiscussionTree'

const C = {
  ink: '#1a1814', ink2: '#4a4640', ink3: '#8a8480',
  paper2: '#f0ede6', paper3: '#e4e0d8',
  gold: '#b8860b', goldLt: '#f5ecd0',
  sans: "'Inter', system-ui, sans-serif",
  serif: "'EB Garamond', Georgia, serif",
}

interface Tag {
  id: string
  name: string
  postCount: number
}

interface Props {
  bookN: number
  userId: string | null
  onAuthRequired: () => void
}

type TagSortKey = 'date' | 'posts'

export default function TagsSection({ bookN, userId, onAuthRequired }: Props) {
  const [tags, setTags] = useState<Tag[]>([])
  const [sortedTags, setSortedTags] = useState<Tag[]>([])
  const [tagSort, setTagSort] = useState<TagSortKey>('posts')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTag, setActiveTag] = useState<Tag | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { loadTags() }, [bookN])

  useEffect(() => {
    const sorted = [...tags].sort((a, b) => {
      if (tagSort === 'posts') return b.postCount - a.postCount
      return 0 // 'date' — already in creation order from DB
    })
    setSortedTags(sorted)
  }, [tags, tagSort])

  async function loadTags() {
    setLoading(true)
    const { data } = await supabase.from('tags').select('id, name').eq('book_n', bookN).order('created_at')
    if (!data) { setLoading(false); return }

    // Get post counts for each tag
    const counts = await Promise.all(
      data.map(t =>
        supabase.from('discussion_posts').select('id', { count: 'exact' }).eq('tag_id', t.id)
          .then(({ count }) => ({ id: t.id, count: count || 0 }))
      )
    )
    const countMap: Record<string, number> = {}
    counts.forEach(c => { countMap[c.id] = c.count })

    setTags(data.map(t => ({ ...t, postCount: countMap[t.id] || 0 })))
    setLoading(false)
  }

  const handleAddTag = async () => {
    if (!userId) { onAuthRequired(); return }
    const name = newTag.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/g, '')
    if (!name) { setError('Введи название тега'); return }
    if (name.length < 2) { setError('Минимум 2 символа'); return }
    if (name.length > 40) { setError('Максимум 40 символов'); return }
    if (tags.some(t => t.name === name)) { setError('Такой тег уже есть'); return }

    setSubmitting(true)
    setError('')
    const { data, error: dbErr } = await supabase.from('tags')
      .insert({ book_n: bookN, name, created_by: userId })
      .select().single()

    if (dbErr) {
      setError(dbErr.code === '23505' ? 'Такой тег уже существует' : dbErr.message)
    } else if (data) {
      const newTagObj = { ...data, postCount: 0 }
      setTags(prev => [...prev, newTagObj])
      setNewTag('')
      setAdding(false)
      setActiveTag(newTagObj)
    }
    setSubmitting(false)
  }

  return (
    <>
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontFamily: C.serif, fontSize: '1.25rem', fontWeight: 400, color: C.ink, margin: 0 }}>
            Обсуждения по темам
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Sort */}
            {tags.length > 1 && (
              <div style={{ display: 'flex', gap: 4 }}>
                {([['posts', 'По сообщениям'], ['date', 'По дате']] as [TagSortKey, string][]).map(([k, l]) => (
                  <button key={k} onClick={() => setTagSort(k)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, border: `1px solid ${tagSort === k ? C.ink : C.paper3}`, background: tagSort === k ? C.ink : '#fff', color: tagSort === k ? C.goldLt : C.ink3, cursor: 'pointer', fontFamily: C.sans, whiteSpace: 'nowrap', transition: 'all 0.12s' }}>
                    {l}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => { if (!userId) { onAuthRequired(); return } setAdding(a => !a); setError('') }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, border: `1px solid ${C.paper3}`, background: adding ? C.ink : '#fff', color: adding ? C.goldLt : C.ink2, cursor: 'pointer', fontSize: 12, fontFamily: C.sans }}
            >
              {adding
                ? <><X size={13} strokeWidth={2.5} />Отмена</>
                : <><Plus size={13} strokeWidth={2.5} />Новая тема</>
              }
            </button>
          </div>
        </div>

        {/* Add tag form */}
        {adding && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                value={newTag}
                onChange={e => { setNewTag(e.target.value); setError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTag() }}
                placeholder="даймоний, познание-себя, душа…"
                autoFocus
                maxLength={40}
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${error ? '#c0392b' : C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.ink, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
              />
              {error && <p style={{ fontSize: 11, color: '#c0392b', fontFamily: C.sans, margin: '4px 0 0' }}>{error}</p>}
              <p style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, margin: '4px 0 0' }}>
                Пробелы → дефисы, только буквы и цифры
              </p>
            </div>
            <button onClick={handleAddTag} disabled={submitting} style={{ padding: '8px 16px', borderRadius: 8, background: C.ink, color: C.goldLt, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: C.sans, opacity: submitting ? 0.6 : 1, flexShrink: 0 }}>
              {submitting ? '...' : 'Создать'}
            </button>
          </div>
        )}

        {/* Tags list */}
        {loading ? (
          <p style={{ color: C.ink3, fontFamily: C.sans, fontSize: 13 }}>Загружаем…</p>
        ) : tags.length === 0 ? (
          <div style={{ padding: '1.25rem', background: C.paper2, borderRadius: 10, border: `1px dashed ${C.paper3}` }}>
            <p style={{ fontSize: 14, color: C.ink3, margin: 0, fontStyle: 'italic', fontFamily: C.sans }}>
              Тем для обсуждения пока нет.{' '}
              {userId
                ? <button onClick={() => setAdding(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gold, fontSize: 14, fontFamily: C.sans }}>Создай первую тему →</button>
                : <><button onClick={onAuthRequired} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gold, fontSize: 14, fontFamily: C.sans }}>Войди</button> чтобы начать обсуждение.</>
              }
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sortedTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setActiveTag(activeTag?.id === tag.id ? null : tag)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 20,
                  border: `1px solid ${activeTag?.id === tag.id ? C.gold : C.paper3}`,
                  background: activeTag?.id === tag.id ? C.goldLt : '#fff',
                  color: activeTag?.id === tag.id ? C.gold : C.ink2,
                  cursor: 'pointer', fontSize: 13, fontFamily: C.sans,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 12, opacity: 0.6 }}>#</span>
                {tag.name}
                {tag.postCount > 0 && (
                  <span style={{ fontSize: 10, background: activeTag?.id === tag.id ? 'rgba(184,134,11,0.2)' : C.paper2, color: activeTag?.id === tag.id ? C.gold : C.ink3, padding: '1px 6px', borderRadius: 10, fontFamily: C.sans }}>
                    {tag.postCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Discussion panel */}
      {activeTag && (
        <DiscussionTree
          tagId={activeTag.id}
          tagName={activeTag.name}
          userId={userId}
          onAuthRequired={onAuthRequired}
          onClose={() => { setActiveTag(null); loadTags() }}
        />
      )}
    </>
  )
}
