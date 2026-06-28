'use client'
import { useState } from 'react'
import { Heart, Star } from 'lucide-react'
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
      setLikedByMe(false); setLikeCount(n => n - 1)
      await supabase.from('review_likes').delete().eq('review_id', review.id).eq('user_id', userId)
    } else {
      setLikedByMe(true); setLikeCount(n => n + 1)
      await supabase.from('review_likes').insert({ review_id: review.id, user_id: userId })
    }
    setLoading(false)
  }

  const username = review.profiles?.username || 'Читатель'

  return (
    <div style={{ padding: '1rem 1.25rem', background: '#fff', border: `1px solid ${C.paper3}`, borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#e0dbd2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {review.profiles?.avatar_url
              ? <img src={review.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={username} />
              : <span style={{ fontSize: 12, fontWeight: 600, color: C.ink2, fontFamily: C.sans }}>{username[0].toUpperCase()}</span>
            }
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: C.sans }}>{username}</span>
          {review.userRating != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: C.goldLt, color: C.gold, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, fontFamily: C.sans }}>
              <Star size={10} strokeWidth={2.5} fill="currentColor" />
              {review.userRating}/10
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans }}>
          {new Date(review.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.65, margin: '0 0 10px', fontFamily: C.sans, whiteSpace: 'pre-wrap' }}>{review.text}</p>

      <button onClick={handleLike} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: `1px solid ${likedByMe ? C.gold : C.paper3}`, background: likedByMe ? C.goldLt : 'transparent', color: likedByMe ? C.gold : C.ink3, cursor: 'pointer', fontSize: 12, fontFamily: C.sans, transition: 'all 0.15s' }}
        aria-label={likedByMe ? 'Убрать лайк' : 'Поставить лайк'}>
        <Heart size={13} strokeWidth={2.5} fill={likedByMe ? 'currentColor' : 'none'} />
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>
    </div>
  )
}
