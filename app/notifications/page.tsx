'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'
import { BOOKS } from '@/lib/books'

const C = {
  ink: '#1a1814', ink2: '#4a4640', ink3: '#8a8480',
  paper: '#faf9f6', paper2: '#f0ede6', paper3: '#e4e0d8',
  gold: '#b8860b', goldLt: '#f5ecd0',
  serif: "'EB Garamond', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
}

type NotifType = 'reply' | 'review_like' | 'post_like'

interface Notif {
  id: string
  type: NotifType
  read: boolean
  created_at: string
  actor: { username: string; avatar_url?: string }
  book_n?: number
  text?: string
}

export default function NotificationsPage() {
  const { user } = useUser()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadNotifications()
  }, [user])

  async function loadNotifications() {
    if (!user) return
    setLoading(true)

    const results: Notif[] = []

    // 1. Replies to my discussion posts
    const { data: myPosts } = await supabase
      .from('discussion_posts')
      .select('id, tag_id, tags(book_n)')
      .eq('user_id', user.id)

    if (myPosts && myPosts.length > 0) {
      const myPostIds = myPosts.map(p => p.id)
      const postBookMap: Record<string, number> = {}
      myPosts.forEach(p => { if ((p.tags as any)?.book_n) postBookMap[p.id] = (p.tags as any).book_n })

      const { data: replies } = await supabase
        .from('discussion_posts')
        .select('id, parent_id, text, created_at, user_id, profiles(username, avatar_url)')
        .in('parent_id', myPostIds)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      ;(replies || []).forEach((r: any) => {
        results.push({
          id: `reply-${r.id}`,
          type: 'reply',
          read: false,
          created_at: r.created_at,
          actor: r.profiles || { username: 'Читатель' },
          book_n: postBookMap[r.parent_id],
          text: r.text,
        })
      })
    }

    // 2. Likes on my reviews
    const { data: myReviews } = await supabase
      .from('reviews')
      .select('id, book_n')
      .eq('user_id', user.id)

    if (myReviews && myReviews.length > 0) {
      const reviewBookMap: Record<string, number> = {}
      myReviews.forEach(r => { reviewBookMap[r.id] = r.book_n })

      const { data: likes } = await supabase
        .from('review_likes')
        .select('id, review_id, created_at, user_id, profiles(username, avatar_url)')
        .in('review_id', myReviews.map(r => r.id))
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      ;(likes || []).forEach((l: any) => {
        results.push({
          id: `like-${l.id}`,
          type: 'review_like',
          read: false,
          created_at: l.created_at,
          actor: l.profiles || { username: 'Читатель' },
          book_n: reviewBookMap[l.review_id],
        })
      })
    }

    // Sort all by date
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setNotifs(results)
    setLoading(false)
  }

  const typeLabel = (type: NotifType) => {
    if (type === 'reply') return 'ответил на ваш комментарий'
    if (type === 'review_like') return 'поставил лайк вашей рецензии'
    if (type === 'post_like') return 'поставил лайк вашему комментарию'
    return ''
  }

  const typeIcon = (type: NotifType) => {
    if (type === 'reply') return '↩'
    if (type === 'review_like') return '♥'
    return '♥'
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', background: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: C.sans, color: C.ink3 }}>Войди чтобы видеть уведомления</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.paper }}>
      <Header activePage="notifications" backHref="/" backLabel="Главная" />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <h1 style={{ fontFamily: C.serif, fontSize: '1.75rem', fontWeight: 400, color: C.ink, margin: '0 0 1.5rem' }}>
          Уведомления
        </h1>

        {loading ? (
          <p style={{ color: C.ink3, fontFamily: C.sans }}>Загружаем…</p>
        ) : notifs.length === 0 ? (
          <div style={{ padding: '2rem', background: C.paper2, borderRadius: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: C.ink3, fontFamily: C.sans, fontStyle: 'italic', margin: 0 }}>
              Уведомлений пока нет. Пиши рецензии и участвуй в обсуждениях!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {notifs.map(n => {
              const book = BOOKS.find(b => b.n === n.book_n)
              const username = n.actor?.username || 'Читатель'
              return (
                <Link key={n.id} href={book ? `/book/${n.book_n}` : '/'} style={{ textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 10, transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.paper3)}>
                  {/* Actor avatar */}
                  <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: `hsl(${[...username].reduce((a,c)=>a+c.charCodeAt(0),0)%360},35%,40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    {n.actor?.avatar_url
                      ? <img src={n.actor.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: C.sans }}>{username[0].toUpperCase()}</span>
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: C.ink, fontFamily: C.sans, margin: '0 0 4px', lineHeight: 1.4 }}>
                      <strong>{username}</strong> {typeLabel(n.type)}
                      {book && <span style={{ color: C.ink3 }}> · <em>{book.t}</em></span>}
                    </p>
                    {n.text && (
                      <p style={{ fontSize: 12, color: C.ink3, margin: 0, fontFamily: C.sans, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {n.text}
                      </p>
                    )}
                    <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, marginTop: 4, display: 'block' }}>
                      {new Date(n.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <span style={{ fontSize: 16, flexShrink: 0, color: n.type === 'reply' ? C.gold : '#e74c3c', marginTop: 4 }}>
                    {typeIcon(n.type)}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
