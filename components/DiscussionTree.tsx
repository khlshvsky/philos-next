'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = {
  ink: '#1a1814', ink2: '#4a4640', ink3: '#8a8480',
  paper: '#faf9f6', paper2: '#f0ede6', paper3: '#e4e0d8',
  gold: '#b8860b', goldLt: '#f5ecd0',
  sans: "'Inter', system-ui, sans-serif",
  serif: "'EB Garamond', Georgia, serif",
}

interface Post {
  id: string
  tag_id: string
  parent_id: string | null
  user_id: string
  text: string
  created_at: string
  profiles?: { username: string; avatar_url?: string }
  likeCount: number
  likedByMe: boolean
  children?: Post[]
}

interface Props {
  tagId: string
  tagName: string
  userId: string | null
  onAuthRequired: () => void
  onClose: () => void
}

// Build tree from flat list
function buildTree(posts: Post[]): Post[] {
  const map: Record<string, Post> = {}
  const roots: Post[] = []
  posts.forEach(p => { map[p.id] = { ...p, children: [] } })
  posts.forEach(p => {
    if (p.parent_id && map[p.parent_id]) {
      map[p.parent_id].children!.push(map[p.id])
    } else {
      roots.push(map[p.id])
    }
  })
  return roots
}

function PostNode({ post, userId, depth, tagId, onAuthRequired, onReload }: {
  post: Post; userId: string | null; depth: number; tagId: string
  onAuthRequired: () => void; onReload: () => void
}) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [likedByMe, setLikedByMe] = useState(post.likedByMe)
  const [submitting, setSubmitting] = useState(false)
  const [liking, setLiking] = useState(false)

  const username = post.profiles?.username || 'Читатель'
  const initial = username[0].toUpperCase()
  const hasChildren = post.children && post.children.length > 0
  const indentColor = ['#7261C8','#0F6E56','#3a7d44','#b85c00','#185FA5','#9a6200','#8B1D4A'][depth % 7]

  const handleLike = async () => {
    if (!userId) { onAuthRequired(); return }
    if (liking) return
    setLiking(true)
    if (likedByMe) {
      setLikedByMe(false); setLikeCount(n => n - 1)
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', userId)
    } else {
      setLikedByMe(true); setLikeCount(n => n + 1)
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: userId })
    }
    setLiking(false)
  }

  const handleReply = async () => {
    if (!userId) { onAuthRequired(); return }
    if (!replyText.trim() || submitting) return
    setSubmitting(true)
    await supabase.from('discussion_posts').insert({
      tag_id: tagId, parent_id: post.id,
      user_id: userId, text: replyText.trim()
    })
    setReplyText(''); setReplying(false)
    onReload()
    setSubmitting(false)
  }

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {/* Indent line */}
      {depth > 0 && (
        <div style={{ width: 2, minHeight: '100%', background: indentColor, opacity: 0.25, marginRight: 12, flexShrink: 0, borderRadius: 2 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Post header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#e0dbd2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {post.profiles?.avatar_url ? (
              <img src={post.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={username} />
            ) : (
              <span style={{ fontSize: 10, fontWeight: 600, color: C.ink2, fontFamily: C.sans }}>{initial}</span>
            )}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.ink2, fontFamily: C.sans }}>{username}</span>
          <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans }}>
            {new Date(post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
          {hasChildren && (
            <button onClick={() => setCollapsed(c => !c)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 11, fontFamily: C.sans }}>
              {collapsed ? `▶ ${post.children!.length}` : '▼'}
            </button>
          )}
        </div>

        {/* Post text */}
        {!collapsed && (
          <>
            <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.6, margin: '0 0 6px', fontFamily: C.sans, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.text}</p>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <button onClick={handleLike} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, border: `1px solid ${likedByMe ? C.gold : C.paper3}`, background: likedByMe ? C.goldLt : 'transparent', color: likedByMe ? C.gold : C.ink3, cursor: 'pointer', fontSize: 11, fontFamily: C.sans, transition: 'all 0.15s' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill={likedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {likeCount > 0 ? likeCount : 'Нравится'}
              </button>
              <button onClick={() => { if (!userId) { onAuthRequired(); return } setReplying(r => !r) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 11, fontFamily: C.sans }}>
                ↩ Ответить
              </button>
            </div>

            {/* Reply box */}
            {replying && (
              <div style={{ marginBottom: 10 }}>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Написать ответ…"
                  rows={3}
                  autoFocus
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.ink, resize: 'none', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={handleReply} disabled={submitting || !replyText.trim()} style={{ padding: '6px 14px', borderRadius: 8, background: C.ink, color: C.goldLt, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: C.sans, opacity: submitting ? 0.6 : 1 }}>
                    {submitting ? '...' : 'Отправить'}
                  </button>
                  <button onClick={() => { setReplying(false); setReplyText('') }} style={{ padding: '6px 14px', borderRadius: 8, background: 'none', border: `1px solid ${C.paper3}`, cursor: 'pointer', fontSize: 12, fontFamily: C.sans, color: C.ink3 }}>
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {/* Children */}
            {hasChildren && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
                {post.children!.map(child => (
                  <PostNode key={child.id} post={child} userId={userId} depth={depth + 1} tagId={tagId} onAuthRequired={onAuthRequired} onReload={onReload} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function DiscussionTree({ tagId, tagName, userId, onAuthRequired, onClose }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadPosts() }, [tagId])

  async function loadPosts() {
    setLoading(true)
    const [{ data: postsData }, { data: likesData }] = await Promise.all([
      supabase.from('discussion_posts').select('*, profiles(username, avatar_url)').eq('tag_id', tagId).order('created_at'),
      supabase.from('post_likes').select('post_id, user_id').in('post_id',
        (await supabase.from('discussion_posts').select('id').eq('tag_id', tagId)).data?.map(p => p.id) || []
      ),
    ])

    const likeMap: Record<string, { count: number; mine: boolean }> = {}
    ;(likesData || []).forEach(l => {
      if (!likeMap[l.post_id]) likeMap[l.post_id] = { count: 0, mine: false }
      likeMap[l.post_id].count++
      if (l.user_id === userId) likeMap[l.post_id].mine = true
    })

    const enriched: Post[] = (postsData || []).map(p => ({
      ...p,
      likeCount: likeMap[p.id]?.count || 0,
      likedByMe: likeMap[p.id]?.mine || false,
    }))

    setPosts(buildTree(enriched))
    setLoading(false)
  }

  const handlePost = async () => {
    if (!userId) { onAuthRequired(); return }
    if (!newText.trim() || submitting) return
    setSubmitting(true)
    await supabase.from('discussion_posts').insert({ tag_id: tagId, parent_id: null, user_id: userId, text: newText.trim() })
    setNewText('')
    loadPosts()
    setSubmitting(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,12,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: '0' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: C.paper, width: '100%', maxWidth: 760, maxHeight: '85vh', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${C.paper3}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Обсуждение тега</div>
            <h3 style={{ fontFamily: C.serif, fontSize: '1.2rem', fontWeight: 400, color: C.ink, margin: 0 }}>#{tagName}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Posts */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {loading ? (
            <p style={{ color: C.ink3, fontFamily: C.sans, fontSize: 13 }}>Загружаем…</p>
          ) : posts.length === 0 ? (
            <p style={{ color: C.ink3, fontFamily: C.sans, fontSize: 14, fontStyle: 'italic' }}>Обсуждений пока нет. Начни первым!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {posts.map(p => (
                <PostNode key={p.id} post={p} userId={userId} depth={0} tagId={tagId} onAuthRequired={onAuthRequired} onReload={loadPosts} />
              ))}
            </div>
          )}
        </div>

        {/* New post */}
        <div style={{ padding: '1rem 1.5rem', borderTop: `1px solid ${C.paper3}`, flexShrink: 0 }}>
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder={userId ? `Написать в обсуждение #${tagName}…` : 'Войди чтобы написать'}
            rows={2}
            disabled={!userId}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handlePost() }}
            style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.ink, resize: 'none', outline: 'none', background: userId ? '#fff' : C.paper2, boxSizing: 'border-box', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans }}>Cmd/Ctrl + Enter отправить</span>
            <button onClick={handlePost} disabled={submitting || !newText.trim() || !userId} style={{ padding: '7px 16px', borderRadius: 8, background: C.ink, color: C.goldLt, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: C.sans, opacity: (!newText.trim() || submitting) ? 0.5 : 1 }}>
              {submitting ? '...' : 'Отправить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
