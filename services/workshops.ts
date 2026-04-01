import { createClient } from '@/lib/supabase/client'
import type { UserWorkshop } from '@/types/database'

export async function getUserWorkshops(): Promise<UserWorkshop[]> {
  const supabase = createClient()

  // user_workshop.user_id references profiles.id, NOT auth.uid().
  // Get the current user's auth UUID first, then filter profiles explicitly so
  // superadmin's "see all profiles" RLS policy doesn't cause .single() to blow up.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle()
  if (!profile) return []

  const { data, error } = await supabase
    .from('user_workshop')
    .select('*, roles(name), workshops(*)')
    .eq('user_id', profile.id)
    .eq('is_active', true)
  if (error) throw error
  return data ?? []
}

export async function switchWorkshop(workshopId: string) {
  const supabase = createClient()

  const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()

  if (sessionError || !session?.access_token) {
    throw new Error('No active session. Please log in again.')
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/switch-workshop`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ workshopId }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Failed to switch workshop')
  }

  const result = await res.json()

  // Refrescar sesión para que el nuevo JWT con app_metadata actualizado
  // esté disponible en el cliente inmediatamente
  await supabase.auth.refreshSession()

  return result
}
