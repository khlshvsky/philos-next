'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { BOOKS, ERA_ORDER, ERA_META } from '@/lib/books'
import { useUser } from '@/lib/useUser'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/AuthModal'

const C = {
  ink: '#1a1814', ink2: '#4a4640', ink3: '#8a8480',
  paper: '#faf9f6', paper2: '#f0ede6', paper3: '#e4e0d8',
  gold: '#b8860b', goldLt: '#f5ecd0',
  serif: "'EB Garamond', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
}

const DONE_KEY = 'philos-done-v2'

function useProgress() {
  const [done, setDone] = useState<Set<number>>(new Set())
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DONE_KEY)
      if (raw) setDone(new Set(JSON.parse(raw)))
    } catch {}
  }, [])
  const toggle = (n: number) => {
    setDone(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n); else next.add(n)
      try { localStorage.setItem(DONE_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }
  return { done, toggle }
}

// A6: hover effect hook
function useHover() {
  const [hovered, setHovered] = useState<number | null>(null)
  return { hovered, onEnter: (n: number) => setHovered(n), onLeave: () => setHovered(null) }
}

export default function HomePage() {
  const { done, toggle } = useProgress()
  const { user, loading: userLoading, signOut } = useUser()
  const { hovered, onEnter, onLeave } = useHover()
  const [era, setEra] = useState('all')
  const [query, setQuery] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [profile, setProfile] = useState<{ username: string; avatar_url?: string } | null>(null)

  // Load profile
  useEffect(() => {
    if (!user) { setProfile(null); return }
    supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [user])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return BOOKS.filter(b => {
      const eraMatch = era === 'all' || b.era === era
      const textMatch = !q || b.t.toLowerCase().includes(q) || b.a.toLowerCase().includes(q)
      return eraMatch && textMatch
    })
  }, [era, query])

  const eras = ERA_ORDER.filter(e => filtered.some(b => b.era === e))
  const doneCount = done.size
  const totalHours = BOOKS.filter(b => done.has(b.n)).reduce((s, b) => s + b.h, 0)
  const leftHours = BOOKS.filter(b => !done.has(b.n)).reduce((s, b) => s + b.h, 0)
  const pct = Math.round(doneCount / BOOKS.length * 100)
  // A3: days remaining
  const daysLeft = leftHours

  // ERA counts for filters
  const eraCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    BOOKS.forEach(b => { counts[b.era] = (counts[b.era] || 0) + 1 })
    return counts
  }, [])

  return (
    <div style={{ background: C.paper, minHeight: '100vh' }}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* ── Hero ── */}
      <div style={{ position: 'relative', width: '100%', height: 'clamp(280px, 40vw, 460px)', overflow: 'hidden' }}>
        <img src="/philos-next/hero.jpg" alt="Своды православного храма"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,8,4,0.3) 0%, rgba(10,8,4,0.68) 100%)' }} />

        {/* A1: auth button top-right on hero */}
        <div style={{ position: 'absolute', top: 16, right: 20, zIndex: 10 }}>
          {!userLoading && (
            user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '5px 12px 5px 6px' }}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} alt="avatar" />
                  ) : (
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: C.sans }}>
                      {(profile?.username || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontSize: 13, color: '#fff', fontFamily: C.sans, fontWeight: 500 }}>
                    {profile?.username || user.email?.split('@')[0]}
                  </span>
                </Link>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} style={{ fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontFamily: C.sans, fontWeight: 500, backdropFilter: 'blur(8px)' }}>
                Войти
              </button>
            )
          )}
        </div>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem' }}>
          <Link href="/" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.gold, marginBottom: 14, display: 'inline-block', background: 'rgba(10,8,4,0.45)', padding: '4px 14px', borderRadius: 20, backdropFilter: 'blur(4px)', textDecoration: 'none' }}>← Философский канон</Link>
          <h1 style={{ fontFamily: C.serif, fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700, color: '#ffffff', lineHeight: 1.1, margin: '0 0 0.75rem', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            Библиотека
          </h1>
          <p style={{ fontSize: 'clamp(13px,2vw,16px)', color: 'rgba(255,255,255,0.65)', margin: 0, letterSpacing: '0.03em', fontFamily: C.sans }}>
            121 книга · хронологический порядок · один час в день
          </p>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ background: '#141210' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { v: doneCount, l: 'прочитано' },
            { v: BOOKS.length, l: 'книг всего' },
            // A3: show only if user logged in
            ...(user ? [
              { v: totalHours, l: 'часов прочитано' },
              { v: `~${daysLeft} дн`, l: 'осталось при 1 ч/день' },
            ] : []),
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <div style={{ width: 1, height: 44, background: 'rgba(255,255,255,0.08)' }} />}
              <div style={{ padding: '0.7rem 1.75rem', textAlign: 'center' }}>
                <div style={{ fontFamily: C.serif, fontSize: '1.5rem', color: '#ffffff', lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3, fontFamily: C.sans }}>{s.l}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ height: '100%', background: C.gold, width: `${pct}%`, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* ── Sticky controls ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: C.paper, borderBottom: `1px solid ${C.paper3}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <input type="text" placeholder="Поиск по названию или автору…" value={query} onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', maxWidth: 400, padding: '8px 14px', border: `1px solid ${C.paper3}`, borderRadius: 8, background: '#ffffff', fontFamily: C.sans, fontSize: 14, color: C.ink, outline: 'none' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['all', ...ERA_ORDER].map(e => (
              <button key={e} onClick={() => setEra(e)} style={{ fontSize: 12, padding: '4px 13px', borderRadius: 20, border: `1px solid ${era === e ? C.ink : C.paper3}`, background: era === e ? C.ink : '#ffffff', color: era === e ? C.goldLt : C.ink2, cursor: 'pointer', fontWeight: era === e ? 500 : 400, fontFamily: C.sans }}>
                {/* A4: show count */}
                {e === 'all' ? `Все эпохи (${BOOKS.length})` : `${e} (${eraCounts[e] || 0})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Book list ── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '1.75rem 1.5rem 4rem', background: C.paper }}>
        {eras.map(eraName => {
          const group = filtered.filter(b => b.era === eraName)
          const meta = ERA_META[eraName as keyof typeof ERA_META]
          const clusters: Array<{ groupName?: string; books: typeof group }> = []
          let i = 0
          while (i < group.length) {
            if ((group[i] as any).group) {
              const gName = (group[i] as any).group
              const run: typeof group = []
              while (i < group.length && (group[i] as any).group === gName) run.push(group[i++])
              clusters.push({ groupName: gName, books: run })
            } else {
              const run: typeof group = []
              while (i < group.length && !(group[i] as any).group) run.push(group[i++])
              clusters.push({ books: run })
            }
          }
          return (
            <section key={eraName} style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: `1px solid ${C.paper3}` }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                <div>
                  {/* A2: bigger era title */}
                  <h2 style={{ fontFamily: C.serif, fontSize: '1.3rem', fontWeight: 500, margin: 0, color: C.ink }}>{eraName}</h2>
                  <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans }}>{meta.dates} · {group.length} книг</span>
                </div>
              </div>

              {clusters.map((cluster, ci) => (
                <div key={ci}>
                  {cluster.groupName && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '10px 12px 6px', background: C.paper2, border: `1px dashed ${C.paper3}`, borderBottom: 'none', borderRadius: '8px 8px 0 0' }}>
                      <span style={{ fontFamily: C.serif, fontStyle: 'italic', fontSize: 13, color: C.ink2 }}>{cluster.groupName}</span>
                      <span style={{ fontSize: 10, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: C.sans }}>{cluster.books.length} текстов · в рекомендованном порядке</span>
                    </div>
                  )}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8,
                    ...(cluster.groupName ? { padding: '8px 10px 10px', background: C.paper2, border: `1px dashed ${C.paper3}`, borderTop: 'none', borderRadius: '0 0 8px 8px', marginBottom: 12 } : { marginBottom: 8 })
                  }}>
                    {cluster.books.map(book => {
                      const isDone = done.has(book.n)
                      const isHov = hovered === book.n
                      return (
                        // A6: entire card is clickable, with hover effect
                        <Link
                          key={book.n}
                          href={`/book/${book.n}`}
                          onMouseEnter={() => onEnter(book.n)}
                          onMouseLeave={onLeave}
                          style={{
                            background: isDone ? C.paper2 : '#ffffff',
                            border: `1px solid ${isHov ? C.gold : C.paper3}`,
                            borderRadius: 8, padding: '11px 12px',
                            display: 'flex', flexDirection: 'column', gap: 6,
                            opacity: isDone ? 0.72 : 1,
                            textDecoration: 'none',
                            boxShadow: isHov ? '0 4px 16px rgba(0,0,0,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
                            transform: isHov ? 'translateY(-2px)' : 'translateY(0)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* top row: number + check */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, color: C.ink3, minWidth: 20, fontFamily: C.sans }}>{book.n}</span>
                            <button
                              onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(book.n) }}
                              style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${isDone ? '#1D9E75' : C.paper3}`, background: isDone ? '#1D9E75' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0 }}
                              aria-label={isDone ? 'Отметить непрочитанным' : 'Отметить прочитанным'}
                            >
                              {isDone && <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><polyline points="2,7 6,11 12,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </button>
                          </div>

                          {/* A2: title larger, author smaller and muted */}
                          <div style={{ flex: 1 }}>
                            <span style={{ fontFamily: C.serif, fontSize: 15, fontWeight: 500, color: isDone ? C.ink3 : C.ink, lineHeight: 1.3, textDecoration: isDone ? 'line-through' : 'none', display: 'block' }}>
                              {book.t}
                            </span>
                            <p style={{ fontSize: 11, color: C.ink3, marginTop: 4, fontFamily: C.sans, margin: '4px 0 0', letterSpacing: '0.01em' }}>{book.a}</p>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: `1px solid ${C.paper3}` }}>
                            <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans }}>{book.y}</span>
                            <span style={{ fontSize: 11, fontWeight: 500, color: C.gold, background: C.goldLt, padding: '1px 7px', borderRadius: 10, fontFamily: C.sans }}>{book.h} ч</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </section>
          )
        })}
        {filtered.length === 0 && (
          <p style={{ fontFamily: C.serif, fontStyle: 'italic', color: C.ink3, fontSize: '1.1rem' }}>Ничего не найдено</p>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '1.5rem', fontSize: 12, color: C.ink3, borderTop: `1px solid ${C.paper3}`, fontFamily: C.sans, background: C.paper }}>
        Философский канон · прогресс сохраняется в браузере
      </footer>
    </div>
  )
}
