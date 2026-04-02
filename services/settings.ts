import { createClient } from '@/lib/supabase/client'
import { parseDbError } from '@/lib/supabase/errors'

// ─── Workshop ─────────────────────────────────────────────────────────────────

export interface WorkshopSettings {
  id: string
  name: string
  rfc: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  tax_rate: number
}

export async function getWorkshop(workshopId: string): Promise<WorkshopSettings> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workshops')
    .select('id, name, rfc, phone, address, logo_url, tax_rate')
    .eq('id', workshopId)
    .single()
  if (error) throw error
  return data
}

export async function updateWorkshop(
  workshopId: string,
  payload: Partial<Pick<WorkshopSettings, 'name' | 'rfc' | 'phone' | 'address' | 'logo_url' | 'tax_rate'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('workshops')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', workshopId)
  if (error) throw new Error(parseDbError(error))
}

export async function uploadWorkshopLogo(workshopId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${workshopId}/logo.${ext}`

  const { error } = await supabase.storage
    .from('workshop-logos')
    .upload(path, file, { upsert: true })
  if (error) throw error

  const { data } = supabase.storage.from('workshop-logos').getPublicUrl(path)
  // Append cache-busting param so browsers reload the new image
  return `${data.publicUrl}?t=${Date.now()}`
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface ProfileSettings {
  id: string
  name: string
  last_name: string
  second_last_name: string | null
}

export async function getMyProfile(): Promise<ProfileSettings> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No session')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, last_name, second_last_name')
    .eq('auth_id', user.id)
    .single()
  if (error) throw error
  return data
}

export async function updateMyProfile(
  profileId: string,
  payload: Partial<Pick<ProfileSettings, 'name' | 'last_name' | 'second_last_name'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', profileId)
  if (error) throw new Error(parseDbError(error))
}

export async function updatePassword(newPassword: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string          // user_workshop.id
  user_id: string     // profile.id
  role_id: string
  is_active: boolean
  profiles: {
    name: string
    last_name: string
    second_last_name: string | null
  }
  roles: {
    id: string
    name: string
  }
}

export async function getTeamMembers(workshopId: string): Promise<TeamMember[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_workshop')
    .select('id, user_id, role_id, is_active, profiles(name, last_name, second_last_name), roles(id, name)')
    .eq('workshop_id', workshopId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as unknown as TeamMember[]
}

export async function updateMemberRole(membershipId: string, roleId: string): Promise<void> {
  const supabase = createClient()
  const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
  if (sessionError || !session) throw new Error('No active session')

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-member-role`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ membershipId, roleId }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Error al actualizar rol')
  }
}

export async function setMemberActive(membershipId: string, isActive: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('user_workshop')
    .update({ is_active: isActive })
    .eq('id', membershipId)
  if (error) throw error
}

export async function inviteTeamMember(payload: {
  email: string
  name: string
  last_name: string
  role: 'admin' | 'mechanic' | 'receptionist'
}): Promise<{ alreadyRegistered?: boolean; alreadyMember?: boolean }> {
  const supabase = createClient()
  const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
  if (sessionError || !session) throw new Error('No active session')

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-team-member`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Error al invitar usuario')
  }
  return res.json()
}

// ─── Roles (para selects) ─────────────────────────────────────────────────────

export interface Role {
  id: string
  name: string
}

export async function getRoles(): Promise<Role[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('roles')
    .select('id, name')
    .not('name', 'in', '(superadmin,owner)')
    .order('name')
  if (error) throw error
  return data ?? []
}
