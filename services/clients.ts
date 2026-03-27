import { createClient } from '@/lib/supabase/client'
import { parseDbError } from '@/lib/supabase/errors'

export const CLIENTS_PAGE_SIZE = 20

export async function getClients(workshopId: string, params?: { search?: string; page?: number }) {
  const supabase  = createClient()
  const page      = params?.page ?? 1
  const pageSize  = CLIENTS_PAGE_SIZE
  const from      = (page - 1) * pageSize
  const to        = from + pageSize - 1
  const search    = params?.search?.trim()

  let query = supabase
    .from('profiles')
    .select('*, contacts(*)', { count: 'exact' })
    .eq('is_active', true)
    .order('last_name')
    .range(from, to)

  if (search) {
    const s = `%${search}%`
    // Buscar perfiles cuyo teléfono coincida para incluirlos vía OR
    const { data: contactMatches } = await supabase
      .from('contacts')
      .select('user_id')
      .eq('contact_type', 'phone')
      .ilike('contact', s)
    const phoneIds = (contactMatches ?? []).map(c => c.user_id as string)

    const nameFiler = `name.ilike.${s},last_name.ilike.${s},rfc.ilike.${s}`
    if (phoneIds.length > 0) {
      query = query.or(`${nameFiler},id.in.(${phoneIds.join(',')})`)
    } else {
      query = query.or(nameFiler)
    }
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], total: count ?? 0 }
}

export async function createClient_(payload: {
  name: string
  lastName: string
  secondLastName?: string
  rfc?: string
  phone?: string
  email?: string
  workshopId: string
}) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('add_client_to_workshop', {
    p_workshop_id:      payload.workshopId,
    p_name:             payload.name,
    p_last_name:        payload.lastName,
    p_second_last_name: payload.secondLastName ?? null,
    p_rfc:              payload.rfc ?? null,
    p_phone:            payload.phone ?? null,
    p_email:            payload.email ?? null,
  })

  if (error) throw new Error(parseDbError(error))

  // Retornar el profile completo recién creado
  const clientId = data?.[0]?.client_id
  if (!clientId) throw new Error('No client_id returned from function')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, contacts(*)')
    .eq('id', clientId)
    .single()

  if (profileError) throw profileError
  return profile
}

export async function getVehiclesByClient(clientId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('year', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createVehicle(payload: {
  clientId: string
  brand: string
  model: string
  year: number
}) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('add_vehicle', {
    p_client_id: payload.clientId,
    p_brand:     payload.brand,
    p_model:     payload.model,
    p_year:      payload.year,
  })
  if (error) throw error
  return (data as any[])[0]
}
