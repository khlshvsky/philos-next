import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qoprsbchnshrmyqwqnhk.supabase.co'
const SUPABASE_KEY = 'sb_publishable_BKm46fs15BLn95KUip6J_w_PrM2XQQC'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export type Profile = {
  id: string
  username: string
  created_at: string
}

export type Review = {
  id: string
  user_id: string
  book_n: number
  text: string
  created_at: string
  updated_at: string
  profiles?: { username: string }
}

export type Rating = {
  id: string
  user_id: string
  book_n: number
  rating: number
}
