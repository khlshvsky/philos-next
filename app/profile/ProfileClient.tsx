'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useUser } from '@/lib/useUser'
import { supabase } from '@/lib/supabase'
import { BOOKS } from '@/lib/books'

const C = {
  ink: '#1a1814', ink2: '#4a4640', ink3: '#8a8480',
  paper: '#faf9f6', paper2: '#f0ede6', paper3: '#e4e0d8',
  gold: '#b8860b', goldLt: '#f5ecd0',
  serif: "'EB Garamond', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
}

const DONE_KEY = 'philos-done-v2'

interface Review {
  id: string
  book_n: number
  text: string
  created_at: string
}

interface Rating {
  book_n: number
  rating: number
}

export default function ProfileClient() {
  const { user, signOut } = useUser()
  const [profile, setProfile] = useState<{ username: string; avatar_url?: string } | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  const [doneCount, setDoneCount] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [username, setUsername] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    loadProfile()
    loadActivity()
    // local progress
    try {
      const raw = localStorage.getItem(DONE_KEY)
      if (raw) setDoneCount(new Set(JSON.parse(raw)).size)
    } catch {}
  }, [user])

  async function loadProfile() {
    if (!user) return
    const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
    if (data) { setProfile(data); setUsername(data.username || '') }
  }

  async function loadActivity() {
    if (!user) return
    const [{ data: rev }, { data: rat }] = await Promise.all([
      supabase.from('reviews').select('id, book_n, text, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('ratings').select('book_n, rating').eq('user_id', user.id),
    ])
    if (rev) setReviews(rev)
    if (rat) setRatings(rat)
  }

  async function saveUsername() {
    if (!user || !username.trim()) return
    const { error } = await supabase.from('profiles').update({ username: username.trim() }).eq('id', user.id)
    if (!error) { setSaveMsg('Сохранено'); setTimeout(() => setSaveMsg(''), 2000); loadProfile() }
    else setSaveMsg('Ошибка: ' + error.message)
  }

  async function uploadAvatar(file: File) {
    if (!user) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setProfile(p => p ? { ...p, avatar_url: url } : null)
    } catch (e: any) {
      alert('Ошибка загрузки: ' + e.message)
    }
    setUploading(false)
  }

  const totalHours = BOOKS.filter(b => {
    try { return new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]')).has(b.n) } catch { return false }
  }).reduce((s, b) => s + b.h, 0)

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: C.serif, fontSize: '1.25rem', color: C.ink2, marginBottom: 16 }}>Войди чтобы увидеть профиль</p>
          <Link href="/" style={{ color: C.gold, fontFamily: C.sans, fontSize: 14 }}>← На главную</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.paper }}>
      {/* Nav */}
      <nav style={{ background: '#141210', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.gold, fontSize: 13, textDecoration: 'none', fontWeight: 500, fontFamily: C.sans }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Весь список
        </Link>
        <button onClick={signOut} style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: C.sans }}>Выйти</button>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

        {/* ── Profile header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', border: `2px solid ${C.paper3}`, background: C.paper2, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
              ) : (
                <span style={{ fontFamily: C.serif, fontSize: '2rem', color: C.ink3 }}>
                  {(profile?.username || user.email || '?')[0].toUpperCase()}
                </span>
              )}
              {/* hover overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M15.232 5.232l3.536 3.536M9 13l6.536-6.536a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3.414a2 2 0 01.586-1.414z"/></svg>
              </div>
            </div>
            {uploading && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 10, fontFamily: C.sans }}>...</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
          </div>

          {/* Username edit */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Zа-яёА-ЯЁ0-9_]/g, ''))}
                maxLength={30}
                style={{ padding: '8px 12px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 15, fontWeight: 500, color: C.ink, outline: 'none', background: '#fff', width: 200 }}
              />
              <button onClick={saveUsername} style={{ padding: '8px 14px', borderRadius: 8, background: C.ink, color: C.goldLt, border: 'none', cursor: 'pointer', fontFamily: C.sans, fontSize: 13, fontWeight: 500 }}>
                Сохранить
              </button>
              {saveMsg && <span style={{ fontSize: 12, color: '#1D9E75', fontFamily: C.sans }}>{saveMsg}</span>}
            </div>
            <p style={{ fontSize: 12, color: C.ink3, fontFamily: C.sans, margin: 0 }}>{user.email}</p>
            <p style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, margin: '4px 0 0' }}>Нажми на аватар чтобы изменить фото</p>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '2.5rem' }}>
          {[
            { v: doneCount, l: 'книг прочитано', sub: `из ${BOOKS.length}` },
            { v: ratings.length, l: 'книг оценено', sub: ratings.length > 0 ? `средняя ${(ratings.reduce((s,r)=>s+r.rating,0)/ratings.length).toFixed(1)}/10` : '' },
            { v: reviews.length, l: 'рецензий', sub: '' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontFamily: C.serif, fontSize: '2rem', fontWeight: 400, color: C.ink, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 12, color: C.ink2, fontFamily: C.sans, marginTop: 4 }}>{s.l}</div>
              {s.sub && <div style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, marginTop: 2 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* ── My Reviews ── */}
        <section>
          <h2 style={{ fontFamily: C.serif, fontSize: '1.4rem', fontWeight: 400, color: C.ink, margin: '0 0 1rem' }}>Мои рецензии</h2>
          {reviews.length === 0 ? (
            <p style={{ color: C.ink3, fontFamily: C.sans, fontSize: 14, fontStyle: 'italic' }}>
              Пока нет рецензий. <Link href="/" style={{ color: C.gold }}>Начни читать →</Link>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reviews.map(r => {
                const book = BOOKS.find(b => b.n === r.book_n)
                const rating = ratings.find(rt => rt.book_n === r.book_n)
                return (
                  <Link key={r.id} href={`/book/${r.book_n}`} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '1rem 1.25rem', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 10, transition: 'border-color 0.15s', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = C.paper3)}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 10 }}>
                        <div>
                          <span style={{ fontFamily: C.serif, fontSize: 15, fontWeight: 500, color: C.ink }}>{book?.t || `Книга #${r.book_n}`}</span>
                          <span style={{ fontSize: 12, color: C.ink3, fontFamily: C.sans, marginLeft: 8 }}>{book?.a}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          {rating && (
                            <span style={{ background: C.goldLt, color: C.gold, fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20, fontFamily: C.sans }}>
                              ★ {rating.rating}/10
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans }}>
                            {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, color: C.ink2, margin: 0, fontFamily: C.sans, lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {r.text}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
