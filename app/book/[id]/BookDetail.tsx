'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import WikiCover from '@/components/WikiCover'
import EraTag from '@/components/EraTag'
import { ERA_META } from '@/lib/books'

const DONE_KEY = 'philos-done-v2'
const REVIEWS_KEY = 'philos-reviews-v2'

interface Book {
  n: number; t: string; a: string; y: string; era: string; h: number;
  group?: string; groupNote?: string
}

interface Props {
  book: Book
  prev: Book | null
  next: Book | null
}

export default function BookDetail({ book, prev, next }: Props) {
  const [isDone, setIsDone] = useState(false)
  const [review, setReview] = useState('')
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const meta = ERA_META[book.era as keyof typeof ERA_META]

  useEffect(() => {
    try {
      const done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'))
      setIsDone(done.has(book.n))
      const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '{}')
      setReview(reviews[book.n] || '')
    } catch {}
  }, [book.n])

  const toggleDone = () => {
    setIsDone(prev => {
      const next = !prev
      try {
        const done = new Set<number>(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'))
        if (next) done.add(book.n); else done.delete(book.n)
        localStorage.setItem(DONE_KEY, JSON.stringify([...done]))
      } catch {}
      return next
    })
  }

  const saveReview = (text: string, showStatus = false) => {
    try {
      const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '{}')
      if (text.trim()) reviews[book.n] = text
      else delete reviews[book.n]
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews))
      if (showStatus) {
        setSaved(true)
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => setSaved(false), 1500)
      }
    } catch {}
  }

  const onReviewChange = (text: string) => {
    setReview(text)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveReview(text, false), 600)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Top nav */}
      <nav style={{ background: 'var(--ink)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Весь список
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>·</span>
        <EraTag era={book.era} small />
      </nav>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        {/* Book header */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          <WikiCover
            title={book.t}
            author={book.a}
            year={book.y}
            size={130}
            className="rounded shadow-md flex-shrink-0"
          />

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>№ {book.n}</span>
              <EraTag era={book.era} small />
            </div>

            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.5rem,4vw,2.1rem)', fontWeight: 700, lineHeight: 1.2, margin: '0 0 0.5rem', color: 'var(--ink)' }}>
              {book.t}
            </h1>

            <p style={{ fontSize: 16, color: 'var(--ink-2)', margin: '0 0 0.25rem' }}>{book.a}</p>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: '1.25rem' }}>{book.y}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Read toggle */}
              <button
                onClick={toggleDone}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 16px', borderRadius: 8,
                  background: isDone ? '#1D9E75' : 'var(--ink)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
                  transition: 'background 0.15s',
                }}
              >
                {isDone ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <polyline points="2,7 6,11 12,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Прочитано
                  </>
                ) : '+ Отметить прочитанным'}
              </button>

              {/* Hours badge */}
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gold)', background: 'var(--gold-lt)', padding: '6px 12px', borderRadius: 8 }}>
                ~{book.h} часов
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--paper-3)', margin: '0 0 2rem' }} />

        {/* My Review */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 400, margin: '0 0 0.75rem', color: 'var(--ink)' }}>
            Моя рецензия
          </h2>
          <textarea
            value={review}
            onChange={e => onReviewChange(e.target.value)}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveReview(review, true) }}
            placeholder="Запиши мысли об этой книге: главная идея, что зацепило, с чем не согласен…"
            rows={6}
            style={{
              width: '100%', padding: '12px 14px',
              border: '1px solid var(--paper-3)', borderRadius: 8,
              background: '#fff', fontFamily: 'var(--font-sans)',
              fontSize: 14, lineHeight: 1.6, color: 'var(--ink)',
              resize: 'vertical', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              Cmd/Ctrl + Enter — сохранить · автосохранение включено
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {saved && <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 500 }}>Сохранено</span>}
              <button
                onClick={() => saveReview(review, true)}
                style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--ink)', color: 'var(--gold-lt)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)' }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </section>

        {/* Coming soon: public reviews placeholder */}
        <section style={{ padding: '1.5rem', background: 'var(--paper-2)', borderRadius: 10, border: '1px solid var(--paper-3)', marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 400, margin: '0 0 0.5rem', color: 'var(--ink)' }}>
            Рецензии читателей
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0, fontStyle: 'italic' }}>
            Публичные рецензии появятся после подключения аккаунтов (этап 2).
          </p>
        </section>

        {/* Prev / Next navigation */}
        <nav style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {prev ? (
            <Link href={`/book/${prev.n}`} style={{ padding: '12px 14px', background: '#fff', border: '1px solid var(--paper-3)', borderRadius: 8, textDecoration: 'none', display: 'block' }}>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>← Предыдущая</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.3 }}>{prev.t}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{prev.a}</div>
            </Link>
          ) : <div />}
          {next ? (
            <Link href={`/book/${next.n}`} style={{ padding: '12px 14px', background: '#fff', border: '1px solid var(--paper-3)', borderRadius: 8, textDecoration: 'none', display: 'block', textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Следующая →</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.3 }}>{next.t}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{next.a}</div>
            </Link>
          ) : <div />}
        </nav>
      </main>
    </div>
  )
}
