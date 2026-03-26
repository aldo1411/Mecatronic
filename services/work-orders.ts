import { createClient } from '@/lib/supabase/client'
import type { WorkOrderPart, WorkOrderState, HistoryNote } from '@/types/database'

export async function addHistoryNote(payload: {
  vehicleId: string
  workOrderId: string
  notes?: string
  diagnostic?: string
  services?: string
}) {
  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('history_notes')
    .insert({
      vehicle_id:    payload.vehicleId,
      work_order_id: payload.workOrderId,
      notes:         payload.notes      ?? null,
      diagnostic:    payload.diagnostic ?? null,
      services:      payload.services   ?? null,
      created_by:    user.user?.id      ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as HistoryNote
}

const HISTORY_PAGE_SIZE = 5

export async function uploadWorkOrderPhoto(
  workshopId: string,
  workOrderId: string,
  file: File
): Promise<string> {
  const supabase = createClient()
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${workshopId}/${workOrderId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('work-order-photos').upload(path, file)
  if (error) throw error
  return path
}

export async function updateWorkOrderPhotos(id: string, photos: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('work_orders').update({ photos }).eq('id', id)
  if (error) throw error
}

export async function deleteWorkOrderPhoto(path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from('work-order-photos').remove([path])
  if (error) throw error
}

export async function getHistoryNotes(vehicleId: string, page = 1) {
  const supabase = createClient()
  const from = (page - 1) * HISTORY_PAGE_SIZE
  const to   = from + HISTORY_PAGE_SIZE - 1
  const { data, error, count } = await supabase
    .from('history_notes')
    .select('*, work_orders(mechanic:profiles!work_orders_mechanic_id_fkey(name, last_name))', { count: 'exact' })
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  return {
    data: (data ?? []) as (HistoryNote & {
      work_orders: { mechanic: { name: string; last_name: string } | null } | null
    })[],
    total: count ?? 0,
  }
}

export { HISTORY_PAGE_SIZE }

export const PAGE_SIZE = 15

export type SortField = 'created_at' | 'folio'
export type SortDir   = 'asc' | 'desc'

export async function getWorkOrders(params?: {
  state?:    WorkOrderState
  page?:     number
  pageSize?: number
  sortField?: SortField
  sortDir?:   SortDir
}) {
  const supabase  = createClient()
  const page      = params?.page      ?? 1
  const pageSize  = params?.pageSize  ?? PAGE_SIZE
  const sortField = params?.sortField ?? 'created_at'
  const sortDir   = params?.sortDir   ?? 'desc'
  const from      = (page - 1) * pageSize
  const to        = from + pageSize - 1

  let query = supabase
    .from('work_orders')
    .select(`
      *,
      profiles!work_orders_client_id_fkey(name, last_name),
      vehicles(brand, model, year),
      mechanics:profiles!work_orders_mechanic_id_fkey(name, last_name)
    `, { count: 'exact' })
    .order(sortField, { ascending: sortDir === 'asc' })
    .range(from, to)

  if (params?.state) {
    query = query.eq('state', params.state)
  } else {
    query = query.eq('is_active', true)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], total: count ?? 0, page, pageSize, sortField, sortDir }
}

export async function getWorkOrder(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      *,
      profiles!work_orders_client_id_fkey(id, name, last_name, rfc),
      vehicles(*, history_notes(*)),
      history_notes!history_notes_work_order_id_fkey(id),
      mechanics:profiles!work_orders_mechanic_id_fkey(id, name, last_name),
      work_order_parts(*, parts(name, sku, unit)),
      invoices(id, status, total, payments(amount), invoice_items(id, description, quantity, unit_price, item_type, tax_amount, total))
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getWorkshopMechanics() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_workshop')
    .select('user_id, profiles!user_workshop_user_id_fkey(id, name, last_name), roles(name)')
    .eq('is_active', true)
    .in('roles.name', ['mechanic', 'admin', 'owner'])
  if (error) throw error
  return (data ?? []).map((m: {
    user_id: string
    profiles: { id: string; name: string; last_name: string }[] | { id: string; name: string; last_name: string } | null
    roles: { name: string }[] | { name: string } | null
  }) => {
    const p = m.profiles
    if (!p) return null
    return Array.isArray(p) ? p[0] ?? null : p
  }).filter(Boolean)
}

export async function createWorkOrder(payload: {
  clientId: string
  vehicleId: string
  mechanicId?: string
  description?: string
  estimatedDelivery?: string
  workshopId: string
}) {
  const supabase = createClient()

  const { data: folioData, error: folioError } = await supabase
    .rpc('generate_folio', {
      p_workshop_id: payload.workshopId,
      p_type: 'OT',
    })
  if (folioError) throw folioError
  const folio = folioData as string

  const { data: user } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('work_orders')
    .insert({
      workshop_id:        payload.workshopId,
      client_id:          payload.clientId,
      vehicle_id:         payload.vehicleId,
      mechanic_id:        payload.mechanicId ?? null,
      description:        payload.description ?? null,
      estimated_delivery: payload.estimatedDelivery ?? null,
      folio,
      state:              'received',
      created_by:         user.user?.id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWorkOrderState(id: string, state: WorkOrderState) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('work_orders')
    .update({ state })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWorkOrderMechanic(id: string, mechanicId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('work_orders')
    .update({ mechanic_id: mechanicId })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function recalculateWorkOrderTotal(workOrderId: string) {
  const supabase = createClient()
  const { data: parts } = await supabase
    .from('work_order_parts')
    .select('quantity, sale_price')
    .eq('work_order_id', workOrderId)
  const total = (parts ?? []).reduce((sum, p) => sum + p.quantity * p.sale_price, 0)
  await supabase.from('work_orders').update({ total_cost: total }).eq('id', workOrderId)
}

export async function cancelWorkOrder(id: string) {
  const supabase = createClient()
  const { error } = await supabase.rpc('cancel_work_order', { p_work_order_id: id })
  if (error) throw error
}

export async function getWorkOrderBalance(workOrderId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_work_order_balance', {
    p_work_order_id: workOrderId,
  })
  if (error) throw error
  return (data as number) ?? 0
}

export async function addWorkOrderPart(payload: {
  workOrderId: string
  partId?: string
  origin: WorkOrderPart['origin']
  quantity: number
  unitCost: number
  salePrice: number
  partName?: string
  notes?: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('work_order_parts')
    .insert({
      work_order_id: payload.workOrderId,
      part_id:       payload.partId ?? null,
      origin:        payload.origin,
      quantity:      payload.quantity,
      unit_cost:     payload.unitCost,
      sale_price:    payload.salePrice,
      part_name:     payload.partName ?? null,
      notes:         payload.notes ?? null,
    })
    .select()
    .single()
  if (error) throw error
  if (payload.origin === 'stock' && payload.partId) {
    await supabase.rpc('decrement_stock', {
      p_part_id:  payload.partId,
      p_quantity: payload.quantity,
    })
  }
  await recalculateWorkOrderTotal(payload.workOrderId)
  return data
}
