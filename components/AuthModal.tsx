'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const C = {
  ink: '#1a1814', ink2: '#4a4640', ink3: '#8a8480',
  paper: '#faf9f6', paper2: '#f0ede6', paper3: '#e4e0d8',
  gold: '#b8860b', goldLt: '#f5ecd0',
  serif: "'EB Garamond', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
}

interface Props {
  onClose: () => void
}

export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Проверь почту — мы отправили письмо для подтверждения.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      }
    } catch (e: any) {
      setError(e.message || 'Что-то пошло не так')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/philos-next/' }
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,12,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: C.paper, borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: C.serif, fontSize: '1.5rem', fontWeight: 400, color: C.ink, margin: 0 }}>
            {mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Google */}
        <button onClick={handleGoogle} style={{ width: '100%', padding: '10px', border: `1px solid ${C.paper3}`, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', fontFamily: C.sans, fontSize: 14, color: C.ink, marginBottom: '1rem' }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Войти через Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
          <div style={{ flex: 1, height: 1, background: C.paper3 }} />
          <span style={{ fontSize: 12, color: C.ink3, fontFamily: C.sans }}>или</span>
          <div style={{ flex: 1, height: 1, background: C.paper3 }} />
        </div>

        {/* Email + Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ padding: '10px 14px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 14, color: C.ink, outline: 'none', background: '#fff' }}
          />
          <input
            type="password" placeholder="Пароль" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{ padding: '10px 14px', border: `1px solid ${C.paper3}`, borderRadius: 8, fontFamily: C.sans, fontSize: 14, color: C.ink, outline: 'none', background: '#fff' }}
          />
        </div>

        {error && <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8, fontFamily: C.sans }}>{error}</p>}
        {success && <p style={{ color: '#1D9E75', fontSize: 13, marginTop: 8, fontFamily: C.sans }}>{success}</p>}

        <button
          onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', marginTop: '1rem', padding: '11px', borderRadius: 8, background: C.ink, color: C.goldLt, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: C.sans, fontSize: 14, fontWeight: 500, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? '...' : mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 13, color: C.ink3, fontFamily: C.sans }}>
          {mode === 'signin' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gold, fontFamily: C.sans, fontSize: 13, fontWeight: 500 }}>
            {mode === 'signin' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </div>
    </div>
  )
}
