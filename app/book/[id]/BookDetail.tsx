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

  // Local state (for non-logged-in users)
  const [isDone, setIsDone] = useState(false)
  const [localReview, setLocalReview] = useState('')
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Supabase state
  const [myRating, setMyRating] = useState<number | null>(null)
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [ratingCount, setRatingCount] = useState(0)
  const [publicReviews, setPublicReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  const meta = ERA_META[book.era as keyof typeof ERA_META]

  // Load local progress
  useEffect(() => {
    try {
      const done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'))
      setIsDone(done.has(book.n))
      const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '{}')
      setLocalReview(reviews[book.n] || '')
    } catch {}
  }, [book.n])

  // Load ratings + public reviews from Supabase
  useEffect(() => {
    loadPublicData()
  }, [book.n, user])

  async function loadPublicData() {
    setReviewsLoading(true)
    try {
      // Public reviews with username
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*, profiles(username)')
        .eq('book_n', book.n)
        .order('created_at', { ascending: false })

      if (reviewData) setPublicReviews(reviewData as Review[])

      // Average rating
      const { data: ratingData } = await supabase
        .from('ratings')
        .select('rating')
        .eq('book_n', book.n)

      if (ratingData && ratingData.length > 0) {
        const avg = ratingData.reduce((s, r) => s + r.rating, 0) / ratingData.length
        setAvgRating(Math.round(avg * 10) / 10)
        setRatingCount(ratingData.length)
      }

      // My rating if logged in
      if (user) {
        const { data: myRatingData } = await supabase
          .from('ratings')
          .select('rating')
          .eq('book_n', book.n)
          .eq('user_id', user.id)
          .single()

        setMyRating(myRatingData?.rating ?? null)
      }
    } catch {}
    setReviewsLoading(false)
  }

  // Toggle done
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
    }
  }

  // Save review
  const saveReview = async (text: string, showStatus = false) => {
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

    if (showStatus) {
      setSaved(true)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => setSaved(false), 1500)
    }
  }

  const onReviewChange = (text: string) => {
    setLocalReview(text)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveReview(text, false), 800)
  }

  // Save rating
  const handleRating = async (rating: number) => {
    if (!user) { setShowAuth(true); return }
    if (rating === 0) {
      setMyRating(null)
      await supabase.from('ratings').delete().eq('user_id', user.id).eq('book_n', book.n)
    } else {
      setMyRating(rating)
      await supabase.from('ratings').upsert(
        { user_id: user.id, book_n: book.n, rating, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,book_n' }
      )
    }
    loadPublicData()
  }

  return (
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink }}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Nav */}
      <nav style={{ background: '#141210', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.gold, fontSize: 13, textDecoration: 'none', fontWeight: 500, fontFamily: C.sans }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Весь список
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <EraTag era={book.era} small />
        </div>

        {/* Auth area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user ? (
            <>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: C.sans }}>
                {user.email?.split('@')[0]}
              </span>
              <button onClick={signOut} style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: C.sans }}>
                Выйти
              </button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{ fontSize: 13, color: C.gold, background: 'none', border: `1px solid rgba(184,134,11,0.4)`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: C.sans }}>
              Войти
            </button>
          )}
        </div>
      </nav>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        {/* Book header */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <WikiCover title={book.t} author={book.a} year={book.y} size={130} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.ink3, fontWeight: 500, fontFamily: C.sans }}>№ {book.n}</span>
              <EraTag era={book.era} small />
            </div>
            <h1 style={{ fontFamily: C.serif, fontSize: 'clamp(1.5rem,4vw,2.1rem)', fontWeight: 700, lineHeight: 1.2, margin: '0 0 0.4rem', color: C.ink }}>
              {book.t}
            </h1>
            <p style={{ fontSize: 16, color: C.ink2, margin: '0 0 0.2rem', fontFamily: C.sans }}>{book.a}</p>
            <p style={{ fontSize: 13, color: C.ink3, marginBottom: '1rem', fontFamily: C.sans }}>{book.y}</p>

            {/* Rating */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                {avgRating !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: C.serif, fontSize: '1.5rem', fontWeight: 400, color: C.gold, lineHeight: 1 }}>{avgRating}</span>
                    <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans }}>/ 10 · {ratingCount} {ratingCount === 1 ? 'оценка' : ratingCount < 5 ? 'оценки' : 'оценок'}</span>
                  </div>
                )}
              </div>
              <div>
                <p style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, marginBottom: 6 }}>
                  {user ? 'Моя оценка:' : 'Войди чтобы оценить:'}
                </p>
                <StarRating
                  value={myRating}
                  onChange={handleRating}
                  readonly={!user}
                  size={20}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={toggleDone} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, background: isDone ? '#1D9E75' : C.ink, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: C.sans }}>
                {isDone ? (<><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 6,11 12,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Прочитано</>) : '+ Отметить прочитанным'}
              </button>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.gold, background: C.goldLt, padding: '6px 12px', borderRadius: 8, fontFamily: C.sans }}>~{book.h} часов</span>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: `1px solid ${C.paper3}`, margin: '0 0 2rem' }} />

        {/* My Review */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: C.serif, fontSize: '1.25rem', fontWeight: 400, margin: '0 0 0.75rem', color: C.ink }}>
            Моя рецензия {!user && <span style={{ fontSize: 13, color: C.ink3, fontFamily: C.sans, fontStyle: 'normal' }}>· <button onClick={() => setShowAuth(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gold, fontSize: 13, fontFamily: C.sans }}>войди</button> чтобы опубликовать</span>}
          </h2>
          <textarea
            value={localReview}
            onChange={e => onReviewChange(e.target.value)}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveReview(localReview, true) }}
            placeholder="Запиши мысли об этой книге: главная идея, что зацепило, с чем не согласен…"
            rows={6}
            style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.paper3}`, borderRadius: 8, background: '#fff', fontFamily: C.sans, fontSize: 14, lineHeight: 1.6, color: C.ink, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans }}>Cmd/Ctrl + Enter — сохранить</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {saved && <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 500, fontFamily: C.sans }}>Сохранено</span>}
              <button onClick={() => saveReview(localReview, true)} style={{ padding: '7px 16px', borderRadius: 8, background: C.ink, color: C.goldLt, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: C.sans }}>Сохранить</button>
            </div>
          </div>
        </section>

        {/* Public reviews */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: C.serif, fontSize: '1.25rem', fontWeight: 400, margin: '0 0 1rem', color: C.ink }}>
            Рецензии читателей
            {ratingCount > 0 && <span style={{ fontSize: 13, color: C.ink3, fontFamily: C.sans, fontWeight: 400, marginLeft: 8 }}>· средняя оценка {avgRating}/10</span>}
          </h2>

          {reviewsLoading ? (
            <p style={{ color: C.ink3, fontFamily: C.sans, fontSize: 14 }}>Загружаем…</p>
          ) : publicReviews.length === 0 ? (
            <div style={{ padding: '1.5rem', background: C.paper2, borderRadius: 10, border: `1px solid ${C.paper3}` }}>
              <p style={{ fontSize: 14, color: C.ink3, margin: 0, fontStyle: 'italic', fontFamily: C.sans }}>
                Рецензий пока нет. {!user && <><button onClick={() => setShowAuth(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gold, fontSize: 14, fontFamily: C.sans }}>Войди</button> и напиши первым.</>}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {publicReviews.map(r => (
                <div key={r.id} style={{ padding: '1rem 1.25rem', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.ink2, fontFamily: C.sans }}>
                      {(r.profiles as any)?.username || 'Читатель'}
                    </span>
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
            <Link href={`/book/${prev.n}`} style={{ padding: '12px 14px', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 8, textDecoration: 'none', display: 'block' }}>
              <div style={{ fontSize: 10, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: C.sans }}>← Предыдущая</div>
              <div style={{ fontFamily: C.serif, fontSize: 14, color: C.ink, lineHeight: 1.3 }}>{prev.t}</div>
              <div style={{ fontSize: 12, color: C.ink2, marginTop: 2, fontFamily: C.sans }}>{prev.a}</div>
            </Link>
          ) : <div />}
          {next ? (
            <Link href={`/book/${next.n}`} style={{ padding: '12px 14px', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 8, textDecoration: 'none', display: 'block', textAlign: 'right' }}>
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
