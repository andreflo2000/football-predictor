import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'free' | 'analyst' | 'pro' | 'owner'

export interface OxianoUser {
  id: string
  email: string
  role: UserRole
}

export async function getCurrentUserWithRole(): Promise<OxianoUser | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('email', user.email)
    .single()

  return {
    id: user.id,
    email: user.email!,
    role: (data?.role as UserRole) ?? 'free',
  }
}
