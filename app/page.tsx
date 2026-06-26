'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/lib/useUser'
import { supabase } from '@/lib/supabase'
import { BOOKS } from '@/lib/books'
import AuthModal from '@/components/AuthModal'
import CollectionsSection from '@/components/CollectionsSection'

const C = {
  ink: '#1a1814', ink2: '#4a4640', ink3: '#8a8480',
  paper: '#faf9f6', paper2: '#f0ede6', paper3: '#e4e0d8',
  gold: '#b8860b', goldLt: '#f5ecd0',
  serif: "'EB Garamond', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
}

interface TopBook { book_n: number; count: number }
interface HotTag { id: string; name: string; book_n: number; count: number }
interface RecentReview { id: string; book_n: number; text: string; created_at: string; profiles: { username: string; avatar_url?: string } }
interface TopReader { user_id: string; count: number; profiles: { username: string; avatar_url?: string } }

export default function HomePage() {
  const { user, loading: userLoading, signOut } = useUser()
  const [showAuth, setShowAuth] = useState(false)
  const [profile, setProfile] = useState<{ username: string; avatar_url?: string } | null>(null)

  const [topBooks, setTopBooks] = useState<TopBook[]>([])
  const [hotTags, setHotTags] = useState<HotTag[]>([])
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([])
  const [topReaders, setTopReaders] = useState<TopReader[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data) })
    } else setProfile(null)
  }, [user])

  useEffect(() => { loadFeedData() }, [])

  async function loadFeedData() {
    setLoading(true)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { data: progressData },
      { data: tagData },
      { data: reviewData },
      { data: readerData },
    ] = await Promise.all([
      // Popular books this week (by new "done" marks)
      supabase.from('reading_progress')
        .select('book_n')
        .eq('done', true)
        .gte('updated_at', oneWeekAgo),

      // Hot tags this week (by new posts)
      supabase.from('discussion_posts')
        .select('tag_id, tags(id, name, book_n)')
        .gte('created_at', oneWeekAgo),

      // Recent reviews
      supabase.from('reviews')
        .select('id, book_n, text, created_at, profiles(username, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(6),

      // Top readers (all time by reading progress)
      supabase.from('reading_progress')
        .select('user_id')
        .eq('done', true),
    ])

    // Aggregate top books
    if (progressData) {
      const counts: Record<number, number> = {}
      progressData.forEach((r: any) => { counts[r.book_n] = (counts[r.book_n] || 0) + 1 })
      const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([book_n, count]) => ({ book_n: Number(book_n), count }))
      setTopBooks(sorted)
    }

    // Aggregate hot tags
    if (tagData) {
      const counts: Record<string, { tag: any; count: number }> = {}
      tagData.forEach((r: any) => {
        if (!r.tags) return
        const id = r.tags.id
        if (!counts[id]) counts[id] = { tag: r.tags, count: 0 }
        counts[id].count++
      })
      const sorted = Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(({ tag, count }) => ({ id: tag.id, name: tag.name, book_n: tag.book_n, count }))
      setHotTags(sorted)
    }

    if (reviewData) setRecentReviews(reviewData as any)

    // Aggregate top readers
    if (readerData) {
      const counts: Record<string, number> = {}
      readerData.forEach((r: any) => { counts[r.user_id] = (counts[r.user_id] || 0) + 1 })
      const topIds = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([id]) => id)
      if (topIds.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url').in('id', topIds)
        if (profilesData) {
          const profMap: Record<string, any> = {}
          profilesData.forEach(p => { profMap[p.id] = p })
          setTopReaders(topIds.map(id => ({ user_id: id, count: counts[id], profiles: profMap[id] || { username: 'Читатель' } })))
        }
      }
    }

    setLoading(false)
  }

  const navStyle: React.CSSProperties = { position: 'absolute', top: 16, right: 20, zIndex: 10, display: 'flex', alignItems: 'center', gap: 10 }

  return (
    <div style={{ background: C.paper, minHeight: '100vh' }}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* ── Hero ── */}
      <div style={{ position: 'relative', width: '100%', height: 'clamp(360px, 50vw, 560px)', overflow: 'hidden' }}>
        <img src="/philos-next/hero.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,8,4,0.2) 0%, rgba(10,8,4,0.75) 100%)' }} />

        {/* Auth */}
        <div style={navStyle}>
          {!userLoading && (user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '5px 12px 5px 6px' }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                ) : (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: C.sans }}>
                    {(profile?.username || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: 13, color: '#fff', fontFamily: C.sans, fontWeight: 500 }}>{profile?.username || user.email?.split('@')[0]}</span>
              </Link>
              <button onClick={signOut} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: C.sans }}>Выйти</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{ fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontFamily: C.sans, fontWeight: 500, backdropFilter: 'blur(8px)' }}>
              Войти
            </button>
          ))}
        </div>

        {/* Hero text */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem' }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.gold, marginBottom: 14, display: 'inline-block', background: 'rgba(10,8,4,0.45)', padding: '4px 14px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
            Философский канон
          </span>
          <h1 style={{ fontFamily: C.serif, fontSize: 'clamp(2.2rem,6vw,4rem)', fontWeight: 700, color: '#fff', lineHeight: 1.1, margin: '0 0 1rem', textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}>
            Читай. Думай.<br />Обсуждай.
          </h1>
          <p style={{ fontSize: 'clamp(14px,2vw,17px)', color: 'rgba(255,255,255,0.65)', margin: '0 0 2rem', fontFamily: C.sans, maxWidth: 480 }}>
            Сообщество читателей философии — рецензии, обсуждения, личный прогресс
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/library" style={{ padding: '11px 24px', borderRadius: 8, background: C.gold, color: '#fff', textDecoration: 'none', fontFamily: C.sans, fontSize: 14, fontWeight: 600, boxShadow: '0 2px 12px rgba(184,134,11,0.4)' }}>
              Открыть библиотеку →
            </Link>
            {!user && (
              <button onClick={() => setShowAuth(true)} style={{ padding: '11px 24px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontFamily: C.sans, fontSize: 14, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                Войти / Зарегистрироваться
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* ── Col 1: Popular books + Hot tags ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Popular books this week */}
            <section>
              <SectionHeader title="Популярные за неделю" icon="📈" />
              {loading ? <Skeleton /> : topBooks.length === 0 ? (
                <EmptyState text="Пока нет активности. Начни читать!" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topBooks.map((item, i) => {
                    const book = BOOKS.find(b => b.n === item.book_n)
                    if (!book) return null
                    return (
                      <Link key={item.book_n} href={`/book/${item.book_n}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 8, transition: 'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = C.paper3)}>
                        <span style={{ fontFamily: C.serif, fontSize: '1.25rem', color: C.ink3, fontWeight: 400, minWidth: 22, textAlign: 'center' }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: C.serif, fontSize: 14, color: C.ink, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{book.t}</div>
                          <div style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, marginTop: 2 }}>{book.a}</div>
                        </div>
                        <span style={{ fontSize: 11, color: C.gold, background: C.goldLt, padding: '2px 7px', borderRadius: 10, fontFamily: C.sans, flexShrink: 0 }}>
                          {item.count} {item.count === 1 ? 'читатель' : 'читателей'}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Hot tags */}
            <section>
              <SectionHeader title="Горячие темы" icon="🔥" />
              {loading ? <Skeleton rows={2} /> : hotTags.length === 0 ? (
                <EmptyState text="Начни обсуждение на странице любой книги" />
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {hotTags.map(tag => {
                    const book = BOOKS.find(b => b.n === tag.book_n)
                    return (
                      <Link key={tag.id} href={`/book/${tag.book_n}`} title={book?.t} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, border: `1px solid ${C.paper3}`, background: '#fff', color: C.ink2, fontFamily: C.sans, fontSize: 13, transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = C.gold; (e.currentTarget as HTMLAnchorElement).style.color = C.gold }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = C.paper3; (e.currentTarget as HTMLAnchorElement).style.color = C.ink2 }}>
                        <span style={{ opacity: 0.5 }}>#</span>{tag.name}
                        <span style={{ fontSize: 10, background: C.paper2, color: C.ink3, padding: '1px 5px', borderRadius: 8 }}>{tag.count}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ── Col 2: Recent reviews ── */}
          <section>
            <SectionHeader title="Последние рецензии" icon="✍️" />
            {loading ? <Skeleton rows={4} /> : recentReviews.length === 0 ? (
              <EmptyState text="Рецензий пока нет" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentReviews.map(r => {
                  const book = BOOKS.find(b => b.n === r.book_n)
                  const username = r.profiles?.username || 'Читатель'
                  return (
                    <Link key={r.id} href={`/book/${r.book_n}`} style={{ textDecoration: 'none', padding: '12px 14px', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 10, display: 'block', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = C.paper3)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: `hsl(${[...username].reduce((a, c) => a + c.charCodeAt(0), 0) % 360},35%,40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {r.profiles?.avatar_url
                            ? <img src={r.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            : <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', fontFamily: C.sans }}>{username[0].toUpperCase()}</span>
                          }
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.ink2, fontFamily: C.sans }}>{username}</span>
                        <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, marginLeft: 'auto' }}>
                          {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div style={{ fontFamily: C.serif, fontSize: 13, color: C.ink3, marginBottom: 4 }}>{book?.t}</div>
                      <p style={{ fontSize: 13, color: C.ink, margin: 0, fontFamily: C.sans, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {r.text}
                      </p>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Col 3: Top readers + Collections ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Top readers */}
            <section>
              <SectionHeader title="Рейтинг читателей" icon="🏆" />
              {loading ? <Skeleton /> : topReaders.length === 0 ? (
                <EmptyState text="Зарегистрируйся и отмечай прочитанные книги" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topReaders.map((reader, i) => {
                    const username = reader.profiles?.username || 'Читатель'
                    const medals = ['🥇', '🥈', '🥉']
                    return (
                      <div key={reader.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 8 }}>
                        <span style={{ fontSize: 16, minWidth: 22, textAlign: 'center' }}>{medals[i] || `${i + 1}`}</span>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: `hsl(${[...username].reduce((a, c) => a + c.charCodeAt(0), 0) % 360},35%,40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {reader.profiles?.avatar_url
                            ? <img src={reader.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            : <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: C.sans }}>{username[0].toUpperCase()}</span>
                          }
                        </div>
                        <span style={{ flex: 1, fontFamily: C.sans, fontSize: 13, fontWeight: 500, color: C.ink }}>{username}</span>
                        <span style={{ fontSize: 12, color: C.ink3, fontFamily: C.sans }}>
                          {reader.count} {reader.count === 1 ? 'книга' : reader.count < 5 ? 'книги' : 'книг'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Personal collections */}
            <section>
              <CollectionsSection userId={user?.id ?? null} onAuthRequired={() => setShowAuth(true)} compact />
            </section>

          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '1.5rem', fontSize: 12, color: C.ink3, borderTop: `1px solid ${C.paper3}`, fontFamily: C.sans, background: C.paper }}>
        <Link href="/library" style={{ color: C.gold, textDecoration: 'none', marginRight: 16 }}>Библиотека</Link>
        Философский канон · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ── Small reusable UI ──────────────────────────────────────────────
function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem', paddingBottom: '0.6rem', borderBottom: `1px solid ${C.paper3}` }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <h2 style={{ fontFamily: C.serif, fontSize: '1.1rem', fontWeight: 500, color: C.ink, margin: 0 }}>{title}</h2>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 13, color: C.ink3, fontFamily: C.sans, fontStyle: 'italic', padding: '1rem', background: C.paper2, borderRadius: 8, margin: 0, textAlign: 'center' }}>{text}</p>
  )
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ height: 52, borderRadius: 8, background: `linear-gradient(90deg, ${C.paper2} 0%, ${C.paper3} 50%, ${C.paper2} 100%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      ))}
    </div>
  )
}
