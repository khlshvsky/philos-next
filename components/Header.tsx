'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Home, BookOpen, Bell, User, LogIn, LogOut,
  ArrowLeft, BookMarked
} from 'lucide-react'
import { useUser } from '@/lib/useUser'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/AuthModal'

const C = {
  gold: '#b8860b', goldLt: '#f5ecd0',
  sans: "'Inter', system-ui, sans-serif",
  serif: "'EB Garamond', Georgia, serif",
}

const NAV = [
  { href: '/',        label: 'Главная',   icon: Home,       page: 'home'    },
  { href: '/library', label: 'Библиотека', icon: BookOpen,   page: 'library' },
]

interface Props {
  activePage?: string
  backHref?: string
  backLabel?: string
  transparent?: boolean
}

export default function Header({ activePage, backHref, backLabel, transparent = false }: Props) {
  const { user, signOut } = useUser()
  const [showAuth, setShowAuth] = useState(false)
  const [profile, setProfile] = useState<{ username: string; avatar_url?: string } | null>(null)
  const [notifCount, setNotifCount] = useState(0)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!transparent) return
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [transparent])

  useEffect(() => {
    if (!user) { setProfile(null); setNotifCount(0); return }
    supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data) })
    loadNotifCount()
  }, [user])

  async function loadNotifCount() {
    if (!user) return
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: myPosts } = await supabase.from('discussion_posts').select('id').eq('user_id', user.id)
    const { data: myReviews } = await supabase.from('reviews').select('id').eq('user_id', user.id)
    let total = 0
    if (myPosts?.length) {
      const { count } = await supabase.from('discussion_posts').select('id', { count: 'exact' })
        .in('parent_id', myPosts.map(p => p.id)).neq('user_id', user.id).gte('created_at', weekAgo)
      total += count || 0
    }
    if (myReviews?.length) {
      const { count } = await supabase.from('review_likes').select('id', { count: 'exact' })
        .in('review_id', myReviews.map(r => r.id)).neq('user_id', user.id).gte('created_at', weekAgo)
      total += count || 0
    }
    setNotifCount(total)
  }

  const glassy = transparent && !scrolled
  const bg = glassy ? 'rgba(0,0,0,0)' : '#141210'
  const border = glassy ? 'none' : '1px solid rgba(255,255,255,0.08)'

  const iconProps = { size: 16, strokeWidth: 2.5 }
  const dimColor = 'rgba(255,255,255,0.45)'
  const activeColor = '#fff'

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <header style={{
        position: transparent ? 'fixed' : 'sticky',
        top: 0, left: 0, right: 0, zIndex: 200,
        background: bg, borderBottom: border,
        backdropFilter: glassy ? 'none' : 'blur(12px)',
        transition: 'background 0.25s, border-color 0.25s',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', gap: 0 }}>

          {/* Back button */}
          {backHref && (
            <Link href={backHref} style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.gold, textDecoration: 'none', fontFamily: C.sans, fontSize: 13, fontWeight: 500, marginRight: 20, flexShrink: 0 }}>
              <ArrowLeft size={15} strokeWidth={2.5} />
              {backLabel || 'Назад'}
            </Link>
          )}

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, marginRight: 28 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(184,134,11,0.18)', border: '1px solid rgba(184,134,11,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookMarked size={15} strokeWidth={2.5} color={C.gold} />
            </div>
            {!backHref && (
              <span style={{ fontFamily: C.serif, fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                Φ<span style={{ color: C.gold }}>.</span>канон
              </span>
            )}
          </Link>

          {/* Main nav */}
          {!backHref && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              {NAV.map(({ href, label, icon: Icon, page }) => {
                const isActive = activePage === page
                return (
                  <Link key={href} href={href} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    textDecoration: 'none', fontFamily: C.sans, fontSize: 13, fontWeight: 500,
                    color: isActive ? activeColor : dimColor,
                    background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = dimColor }}
                  >
                    <Icon size={16} strokeWidth={2.5} />
                    {label}
                  </Link>
                )
              })}
            </nav>
          )}

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            {user ? (
              <>
                {/* Bell */}
                <Link href="/notifications" style={{
                  position: 'relative', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: 8,
                  color: notifCount > 0 ? C.gold : dimColor,
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Bell size={17} strokeWidth={2.5} />
                  {notifCount > 0 && (
                    <span style={{ position: 'absolute', top: 5, right: 5, background: '#e74c3c', color: '#fff', fontSize: 9, fontWeight: 700, fontFamily: C.sans, borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </Link>

                {/* Profile pill */}
                <Link href="/profile" style={{
                  display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none',
                  padding: '4px 10px 4px 4px', borderRadius: 24,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                  ) : (
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: C.sans, flexShrink: 0 }}>
                      {(profile?.username || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: C.sans, fontWeight: 500, maxWidth: 100, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {profile?.username || user.email?.split('@')[0]}
                  </span>
                </Link>

                {/* Sign out */}
                <button onClick={signOut} title="Выйти" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none',
                  color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.08)'); (e.currentTarget.style.color = 'rgba(255,255,255,0.6)') }}
                  onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'rgba(255,255,255,0.3)') }}>
                  <LogOut size={15} strokeWidth={2.5} />
                </button>
              </>
            ) : (
              <button onClick={() => setShowAuth(true)} style={{
                display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#fff',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontFamily: C.sans, fontWeight: 500,
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
                <LogIn size={15} strokeWidth={2.5} />
                Войти
              </button>
            )}
          </div>
        </div>
      </header>
      {!transparent && <div style={{ height: 56 }} />}
    </>
  )
}
