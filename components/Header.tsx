'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/lib/useUser'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/AuthModal'

const C = {
  gold: '#b8860b', goldLt: '#f5ecd0',
  ink3: '#8a8480', paper3: '#e4e0d8',
  sans: "'Inter', system-ui, sans-serif",
  serif: "'EB Garamond', Georgia, serif",
}

// SVG icon set — all paths hand-picked for philosophical/reading aesthetic
import type { ReactElement } from 'react'

function Icon({ name, size = 18, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const icons: Record<string, ReactElement> = {
    // Home — open book silhouette
    home: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    // Library — stack of books
    library: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="6" x2="12" y2="14"/><line x1="9" y1="9" x2="15" y2="9"/></svg>,
    // Collections — layered cards
    collections: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
    // Bell — notification
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    // User — profile
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    // Login
    login: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
    // Back arrow
    back: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  }
  return icons[name] || null
}

interface NavItem {
  href: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Главная', icon: 'home' },
  { href: '/library', label: 'Библиотека', icon: 'library' },
]

interface Props {
  activePage?: 'home' | 'library' | 'book' | 'collection' | 'profile' | 'notifications'
  backHref?: string
  backLabel?: string
  transparent?: boolean // for hero pages where header overlays image
}

export default function Header({ activePage, backHref, backLabel, transparent = false }: Props) {
  const { user, signOut } = useUser()
  const [showAuth, setShowAuth] = useState(false)
  const [profile, setProfile] = useState<{ username: string; avatar_url?: string } | null>(null)
  const [notifCount, setNotifCount] = useState(0)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!transparent) return
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [transparent])

  useEffect(() => {
    if (!user) { setProfile(null); setNotifCount(0); return }
    supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data) })
    loadNotifCount()
  }, [user])

  async function loadNotifCount() {
    if (!user) return
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: myPosts } = await supabase.from('discussion_posts').select('id').eq('user_id', user.id)
    const { data: myReviews } = await supabase.from('reviews').select('id').eq('user_id', user.id)
    let total = 0
    if (myPosts?.length) {
      const { count } = await supabase.from('discussion_posts').select('id', { count: 'exact' })
        .in('parent_id', myPosts.map(p => p.id)).neq('user_id', user.id).gte('created_at', oneWeekAgo)
      total += count || 0
    }
    if (myReviews?.length) {
      const { count } = await supabase.from('review_likes').select('id', { count: 'exact' })
        .in('review_id', myReviews.map(r => r.id)).neq('user_id', user.id).gte('created_at', oneWeekAgo)
      total += count || 0
    }
    setNotifCount(total)
  }

  const isTransparent = transparent && !scrolled
  const bg = isTransparent ? 'rgba(0,0,0,0)' : '#141210'
  const borderBottom = isTransparent ? 'none' : '1px solid rgba(255,255,255,0.08)'

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <header style={{
        position: transparent ? 'fixed' : 'sticky',
        top: 0, left: 0, right: 0, zIndex: 200,
        background: bg,
        borderBottom,
        backdropFilter: isTransparent ? 'none' : 'blur(12px)',
        transition: 'background 0.25s, border-color 0.25s, backdrop-filter 0.25s',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', gap: 0 }}>

          {/* Back button (for inner pages) */}
          {backHref && (
            <Link href={backHref} style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.gold, textDecoration: 'none', fontFamily: C.sans, fontSize: 13, fontWeight: 500, marginRight: 20, flexShrink: 0 }}>
              <Icon name="back" size={16} color={C.gold} />
              {backLabel || 'Назад'}
            </Link>
          )}

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, marginRight: 32 }}>
            <span style={{ fontFamily: C.serif, fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1 }}>
              Φ<span style={{ color: C.gold }}>.</span>
            </span>
            {!backHref && (
              <span style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Канон
              </span>
            )}
          </Link>

          {/* Main nav */}
          {!backHref && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              {NAV_ITEMS.map(item => {
                const isActive = activePage === item.href.replace('/', '') || (item.href === '/' && activePage === 'home')
                return (
                  <Link key={item.href} href={item.href} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    textDecoration: 'none', fontFamily: C.sans, fontSize: 13, fontWeight: 500,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                    background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.8)' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.5)' }}
                  >
                    <Icon name={item.icon} size={16} color={isActive ? '#fff' : 'rgba(255,255,255,0.5)'} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          )}

          {/* Right: notifications + user */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            {user ? (
              <>
                {/* Notifications bell */}
                <Link href="/notifications" style={{ position: 'relative', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, color: notifCount > 0 ? C.gold : 'rgba(255,255,255,0.45)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Icon name="bell" size={18} color="currentColor" />
                  {notifCount > 0 && (
                    <span style={{ position: 'absolute', top: 4, right: 4, background: '#e74c3c', color: '#fff', fontSize: 9, fontWeight: 700, fontFamily: C.sans, borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </Link>

                {/* Profile */}
                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', padding: '4px 10px 4px 4px', borderRadius: 24, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', transition: 'background 0.15s' }}
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

                <button onClick={signOut} title="Выйти" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.08)'); (e.currentTarget.style.color = 'rgba(255,255,255,0.6)') }}
                  onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'rgba(255,255,255,0.3)') }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </>
            ) : (
              <button onClick={() => setShowAuth(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontFamily: C.sans, fontWeight: 500, transition: 'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
                <Icon name="login" size={15} color="#fff" />
                Войти
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Spacer when header is sticky (non-transparent) */}
      {!transparent && <div style={{ height: 56 }} />}
    </>
  )
}
