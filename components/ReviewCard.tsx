'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const C = {
  ink: '#1a1814', ink2: '#4a4640', ink3: '#8a8480',
  paper3: '#e4e0d8', gold: '#b8860b', goldLt: '#f5ecd0',
  sans: "'Inter', system-ui, sans-serif",
  serif: "'EB Garamond', Georgia, serif",
}

interface Props {
  review: {
    id: string
    text: string
    created_at: string
    user_id: string
    userRating?: number | null
    profiles?: { username: string; avatar_url?: string }
    likeCount: number
    likedByMe: boolean
  }
  userId: string | null
  onAuthRequired: () => void
}

export default function ReviewCard({ review, userId, onAuthRequired }: Props) {
  const [likeCount, setLikeCount] = useState(review.likeCount)
  const [likedByMe, setLikedByMe] = useState(review.likedByMe)
  const [loading, setLoading] = useState(false)

  const handleLike = async () => {
    if (!userId) { onAuthRequired(); return }
    if (loading) return
    setLoading(true)

    if (likedByMe) {
      setLikedByMe(false)
      setLikeCount(n => n - 1)
      await supabase.from('review_likes').delete()
        .eq('review_id', review.id).eq('user_id', userId)
    } else {
      setLikedByMe(true)
      setLikeCount(n => n + 1)
      await supabase.from('review_likes').insert({ review_id: review.id, user_id: userId })
    }
    setLoading(false)
  }

  const username = review.profiles?.username || 'Читатель'
  const initial = username[0].toUpperCase()

  return (
    <div style={{ padding: '1rem 1.25rem', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Avatar */}
          <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#e0dbd2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {review.profiles?.avatar_url ? (
              <img src={review.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={username} />
            ) : (
              <span style={{ fontSize: 12, fontWeight: 600, color: C.ink2, fontFamily: C.sans }}>{initial}</span>
            )}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: C.sans }}>{username}</span>
          {review.userRating != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: C.goldLt, color: C.gold, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, fontFamily: C.sans }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
              {review.userRating}/10
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans }}>
          {new Date(review.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Text */}
      <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.65, margin: '0 0 10px', fontFamily: C.sans, whiteSpace: 'pre-wrap' }}>{review.text}</p>

      {/* Like button */}
      <button
        onClick={handleLike}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 20,
          border: `1px solid ${likedByMe ? C.gold : C.paper3}`,
          background: likedByMe ? C.goldLt : 'transparent',
          color: likedByMe ? C.gold : C.ink3,
          cursor: 'pointer', fontSize: 12, fontFamily: C.sans,
          transition: 'all 0.15s',
        }}
        aria-label={likedByMe ? 'Убрать лайк' : 'Поставить лайк'}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill={likedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>
    </div>
  )
}
