'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useNotifCount(userId: string | undefined) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) { setCount(0); return }
    loadCount()
  }, [userId])

  async function loadCount() {
    if (!userId) return
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: myPosts }, { data: myReviews }] = await Promise.all([
      supabase.from('discussion_posts').select('id').eq('user_id', userId),
      supabase.from('reviews').select('id').eq('user_id', userId),
    ])

    let total = 0

    if (myPosts && myPosts.length > 0) {
      const { count: replyCount } = await supabase
        .from('discussion_posts')
        .select('id', { count: 'exact' })
        .in('parent_id', myPosts.map(p => p.id))
        .neq('user_id', userId)
        .gte('created_at', oneWeekAgo)
      total += replyCount || 0
    }

    if (myReviews && myReviews.length > 0) {
      const { count: likeCount } = await supabase
        .from('review_likes')
        .select('id', { count: 'exact' })
        .in('review_id', myReviews.map(r => r.id))
        .neq('user_id', userId)
        .gte('created_at', oneWeekAgo)
      total += likeCount || 0
    }

    setCount(total)
  }

  return count
}
