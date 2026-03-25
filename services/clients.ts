import { createClient } from '@/lib/supabase/client'
import { parseDbError } from '@/lib/supabase/errors'

export async function getClients(workshopId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*, contacts(*)')
    .eq('is_active', true)
    .order('last_name')
  if (error) throw error
  return data ?? []
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
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      client_id: payload.clientId,
      brand: payload.brand,
      model: payload.model,
      year: payload.year,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
