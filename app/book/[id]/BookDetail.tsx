'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import WikiCover from '@/components/WikiCover'
import EraTag from '@/components/EraTag'
import StarRating from '@/components/StarRating'
import AuthModal from '@/components/AuthModal'
import { ERA_META } from '@/lib/books'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'
import type { Review } from '@/lib/supabase'

const C = {
  ink: '#1a1814', ink2: '#4a4640', ink3: '#8a8480',
  paper: '#faf9f6', paper2: '#f0ede6', paper3: '#e4e0d8',
  gold: '#b8860b', goldLt: '#f5ecd0',
  serif: "'EB Garamond', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
}

const DONE_KEY = 'philos-done-v2'
const REVIEWS_KEY = 'philos-reviews-v2'

interface Book { n: number; t: string; a: string; y: string; era: string; h: number }
interface Props { book: Book; prev: Book | null; next: Book | null }

export default function BookDetail({ book, prev, next }: Props) {
  const { user, signOut } = useUser()
  const [showAuth, setShowAuth] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [localReview, setLocalReview] = useState('')
  // B4: autosave status only, no save button
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [myRating, setMyRating] = useState<number | null>(null)
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [ratingCount, setRatingCount] = useState(0)
  const [readCount, setReadCount] = useState(0) // B3
  const [publicReviews, setPublicReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [profile, setProfile] = useState<{ username: string } | null>(null)
  // C5: share state
  const [shared, setShared] = useState(false)
  // C3: mount animation
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // C3: animate in
    requestAnimationFrame(() => setMounted(true))
    try {
      const done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'))
      setIsDone(done.has(book.n))
      const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '{}')
      setLocalReview(reviews[book.n] || '')
    } catch {}
  }, [book.n])

  useEffect(() => {
    loadPublicData()
    if (user) {
      supabase.from('profiles').select('username').eq('id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data) })
    }
  }, [book.n, user])

  async function loadPublicData() {
    setReviewsLoading(true)
    try {
      const [{ data: reviewData }, { data: ratingData }, { data: progressData }] = await Promise.all([
        supabase.from('reviews').select('*, profiles(username)').eq('book_n', book.n).order('created_at', { ascending: false }),
        supabase.from('ratings').select('user_id, rating').eq('book_n', book.n),
        // B3: count readers
        supabase.from('reading_progress').select('id', { count: 'exact' }).eq('book_n', book.n).eq('done', true),
      ])

      const ratingMap: Record<string, number> = {}
      if (ratingData) {
        ratingData.forEach(r => { ratingMap[r.user_id] = r.rating })
        const avg = ratingData.reduce((s, r) => s + r.rating, 0) / ratingData.length
        setAvgRating(Math.round(avg * 10) / 10)
        setRatingCount(ratingData.length)
        if (user) setMyRating(ratingMap[user.id] ?? null)
      }

      if (reviewData) setPublicReviews(reviewData.map(r => ({ ...r, userRating: ratingMap[r.user_id] ?? null })))
      if (progressData !== null) setReadCount((progressData as any).length || 0)
    } catch {}
    setReviewsLoading(false)
  }

  const toggleDone = async () => {
    const next = !isDone
    setIsDone(next)
    try {
      const done = new Set<number>(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'))
      if (next) done.add(book.n); else done.delete(book.n)
      localStorage.setItem(DONE_KEY, JSON.stringify([...done]))
    } catch {}
    if (user) {
      await supabase.from('reading_progress').upsert(
        { user_id: user.id, book_n: book.n, done: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,book_n' }
      )
      loadPublicData()
    }
  }

  // B4: autosave only, no manual save button
  const saveReview = async (text: string) => {
    try {
      const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '{}')
      if (text.trim()) reviews[book.n] = text; else delete reviews[book.n]
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews))
    } catch {}
    if (user && text.trim()) {
      await supabase.from('reviews').upsert(
        { user_id: user.id, book_n: book.n, text: text.trim(), updated_at: new Date().toISOString() },
        { onConflict: 'user_id,book_n' }
      )
      loadPublicData()
    }
    setAutoSaveStatus('saved')
    setTimeout(() => setAutoSaveStatus('idle'), 1500)
  }

  const onReviewChange = (text: string) => {
    setLocalReview(text)
    setAutoSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveReview(text), 800)
  }

  const handleRating = async (rating: number) => {
    if (!user) { setShowAuth(true); return }
    setMyRating(rating === 0 ? null : rating)
    if (rating === 0) await supabase.from('ratings').delete().eq('user_id', user.id).eq('book_n', book.n)
    else await supabase.from('ratings').upsert({ user_id: user.id, book_n: book.n, rating, updated_at: new Date().toISOString() }, { onConflict: 'user_id,book_n' })
    loadPublicData()
  }

  // C5: share
  const handleShare = async () => {
    const url = window.location.href
    const text = `${book.t} — ${book.a} | Философский канон`
    if (navigator.share) {
      try { await navigator.share({ title: text, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  return (
    // C3: fade-in animation on mount
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.25s ease, transform 0.25s ease' }}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Nav */}
      <nav style={{ background: '#141210', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.gold, fontSize: 13, textDecoration: 'none', fontWeight: 500, fontFamily: C.sans }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Весь список
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <EraTag era={book.era} small />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user ? (
            <>
              <Link href="/profile" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: C.sans, textDecoration: 'none' }}>
                {profile?.username || user.email?.split('@')[0]}
              </Link>
              <button onClick={signOut} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: C.sans }}>Выйти</button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{ fontSize: 13, color: C.gold, background: 'none', border: `1px solid rgba(184,134,11,0.4)`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: C.sans }}>Войти</button>
          )}
        </div>
      </nav>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        {/* B1: book header — cover + info side by side, vertically centered */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flexShrink: 0 }}>
            <WikiCover title={book.t} author={book.a} year={book.y} size={130} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.ink3, fontWeight: 500, fontFamily: C.sans }}>№ {book.n}</span>
              <EraTag era={book.era} small />
              {/* B3: reader count */}
              {readCount > 0 && (
                <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  {readCount} {readCount === 1 ? 'читатель' : readCount < 5 ? 'читателя' : 'читателей'}
                </span>
              )}
            </div>

            <h1 style={{ fontFamily: C.serif, fontSize: 'clamp(1.5rem,4vw,2.1rem)', fontWeight: 700, lineHeight: 1.2, margin: '0 0 0.4rem', color: C.ink }}>
              {book.t}
            </h1>
            <p style={{ fontSize: 16, color: C.ink2, margin: '0 0 0.2rem', fontFamily: C.sans }}>{book.a}</p>
            <p style={{ fontSize: 13, color: C.ink3, marginBottom: '1rem', fontFamily: C.sans }}>{book.y}</p>

            {/* Rating */}
            <div style={{ marginBottom: '1rem' }}>
              {avgRating !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: C.serif, fontSize: '1.5rem', fontWeight: 400, color: C.gold, lineHeight: 1 }}>{avgRating}</span>
                  <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans }}>
                    / 10 · {ratingCount} {ratingCount === 1 ? 'оценка' : ratingCount < 5 ? 'оценки' : 'оценок'}
                  </span>
                </div>
              )}
              <p style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, marginBottom: 6 }}>
                {user ? 'Моя оценка:' : <><button onClick={() => setShowAuth(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gold, fontSize: 11, fontFamily: C.sans, padding: 0 }}>Войди</button> чтобы оценить:</>}
              </p>
              <StarRating value={myRating} onChange={handleRating} readonly={!user} size={20} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={toggleDone} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, background: isDone ? '#1D9E75' : C.ink, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: C.sans, transition: 'background 0.15s' }}>
                {isDone ? (<><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 6,11 12,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Прочитано</>) : '+ Отметить прочитанным'}
              </button>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.gold, background: C.goldLt, padding: '6px 12px', borderRadius: 8, fontFamily: C.sans }}>~{book.h} часов</span>

              {/* C5: share button */}
              <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.paper3}`, background: '#fff', color: shared ? '#1D9E75' : C.ink2, cursor: 'pointer', fontSize: 13, fontFamily: C.sans, transition: 'all 0.15s' }}>
                {shared ? (
                  <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 6,11 12,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Скопировано</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Поделиться</>
                )}
              </button>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: `1px solid ${C.paper3}`, margin: '0 0 2rem' }} />

        {/* B4: review — autosave only, no manual save button */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ fontFamily: C.serif, fontSize: '1.25rem', fontWeight: 400, color: C.ink, margin: 0 }}>
              Моя рецензия
              {!user && <span style={{ fontSize: 13, color: C.ink3, fontFamily: C.sans, fontWeight: 400, marginLeft: 8 }}>
                · <button onClick={() => setShowAuth(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gold, fontSize: 13, fontFamily: C.sans }}>войди</button> чтобы опубликовать
              </span>}
            </h2>
            <span style={{ fontSize: 11, fontFamily: C.sans, color: autoSaveStatus === 'saved' ? '#1D9E75' : C.ink3, transition: 'color 0.3s' }}>
              {autoSaveStatus === 'saving' ? 'Сохраняем…' : autoSaveStatus === 'saved' ? '✓ Сохранено' : 'Автосохранение'}
            </span>
          </div>
          <textarea
            value={localReview}
            onChange={e => onReviewChange(e.target.value)}
            placeholder="Запиши мысли об этой книге: главная идея, что зацепило, с чем не согласен…"
            rows={6}
            style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.paper3}`, borderRadius: 8, background: '#fff', fontFamily: C.sans, fontSize: 14, lineHeight: 1.6, color: C.ink, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
        </section>

        {/* Public reviews */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: C.serif, fontSize: '1.25rem', fontWeight: 400, margin: '0 0 1rem', color: C.ink }}>
            Рецензии читателей
            {avgRating !== null && <span style={{ fontSize: 13, color: C.ink3, fontFamily: C.sans, fontWeight: 400, marginLeft: 8 }}>· средняя оценка {avgRating}/10</span>}
          </h2>

          {reviewsLoading ? (
            <p style={{ color: C.ink3, fontFamily: C.sans, fontSize: 14 }}>Загружаем…</p>
          ) : publicReviews.length === 0 ? (
            <div style={{ padding: '1.5rem', background: C.paper2, borderRadius: 10, border: `1px solid ${C.paper3}` }}>
              <p style={{ fontSize: 14, color: C.ink3, margin: 0, fontStyle: 'italic', fontFamily: C.sans }}>
                Рецензий пока нет.{!user && <> <button onClick={() => setShowAuth(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gold, fontSize: 14, fontFamily: C.sans }}>Войди</button> и напиши первым.</>}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {publicReviews.map((r: any) => (
                <div key={r.id} style={{ padding: '1rem 1.25rem', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: C.sans }}>{r.profiles?.username || 'Читатель'}</span>
                      {r.userRating && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: C.goldLt, color: C.gold, fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20, fontFamily: C.sans }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                          {r.userRating}/10
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans }}>
                      {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.65, margin: 0, fontFamily: C.sans, whiteSpace: 'pre-wrap' }}>{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Prev / Next */}
        <nav style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {prev ? (
            <Link href={`/book/${prev.n}`} style={{ padding: '12px 14px', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 8, textDecoration: 'none', display: 'block', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = C.paper3)}>
              <div style={{ fontSize: 10, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: C.sans }}>← Предыдущая</div>
              <div style={{ fontFamily: C.serif, fontSize: 14, color: C.ink, lineHeight: 1.3 }}>{prev.t}</div>
              <div style={{ fontSize: 12, color: C.ink2, marginTop: 2, fontFamily: C.sans }}>{prev.a}</div>
            </Link>
          ) : <div />}
          {next ? (
            <Link href={`/book/${next.n}`} style={{ padding: '12px 14px', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 8, textDecoration: 'none', display: 'block', textAlign: 'right', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = C.paper3)}>
              <div style={{ fontSize: 10, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: C.sans }}>Следующая →</div>
              <div style={{ fontFamily: C.serif, fontSize: 14, color: C.ink, lineHeight: 1.3 }}>{next.t}</div>
              <div style={{ fontSize: 12, color: C.ink2, marginTop: 2, fontFamily: C.sans }}>{next.a}</div>
            </Link>
          ) : <div />}
        </nav>
      </main>
    </div>
  )
}
