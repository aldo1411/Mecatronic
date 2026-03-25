import { createClient } from '@/lib/supabase/client'
import { parseDbError } from '@/lib/supabase/errors'

export const ENTRIES_PAGE_SIZE = 20
export const ADJUSTMENTS_PAGE_SIZE = 20

export async function getParts(search?: string) {
  const supabase = createClient()
  let query = supabase
    .from('parts')
    .select('*, inventory_stock(*)')
    .eq('is_active', true)
    .order('name')
  if (search) query = query.ilike('name', `%${search}%`)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getPartDetail(partId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('parts')
    .select('*, inventory_stock(*)')
    .eq('id', partId)
    .single()
  if (error) throw error
  return data
}

export async function updatePart(partId: string, payload: {
  name: string
  description: string | null
  sku: string | null
  unit: string
  sale_price: number
  min_stock: number
}) {
  const supabase = createClient()
  const { error } = await supabase.from('parts').update(payload).eq('id', partId)
  if (error) throw error
}

export async function deactivatePart(partId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('parts').update({ is_active: false }).eq('id', partId)
  if (error) throw error
}

export async function getLowStockAlerts() {
  const supabase = createClient()
  const { data, error } = await supabase.from('low_stock_alerts').select('*')
  if (error) throw error
  return data ?? []
}

export async function createInventoryEntry(payload: {
  workshopId: string
  partId: string
  supplierId?: string
  quantity: number
  unitCost: number
  invoiceRef?: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('create_inventory_entry', {
    p_workshop_id: payload.workshopId,
    p_part_id:     payload.partId,
    p_quantity:    payload.quantity,
    p_unit_cost:   payload.unitCost,
    p_supplier_id: payload.supplierId ?? null,
    p_invoice_ref: payload.invoiceRef ?? null,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function getInventoryEntries(workshopId: string, page = 1) {
  const supabase = createClient()
  const from = (page - 1) * ENTRIES_PAGE_SIZE
  const to   = from + ENTRIES_PAGE_SIZE - 1
  const { data, error, count } = await supabase
    .from('inventory_entries')
    .select('*, parts(name, sku, unit), suppliers(name)', { count: 'exact' })
    .eq('workshop_id', workshopId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  return { data: data ?? [], total: count ?? 0, page }
}

export async function createInventoryAdjustment(payload: {
  workshopId: string
  partId: string
  type: 'shrinkage' | 'theft' | 'physical_count' | 'damage' | 'other'
  quantityDelta: number
  notes?: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('apply_inventory_adjustment', {
    p_workshop_id:    payload.workshopId,
    p_part_id:        payload.partId,
    p_type:           payload.type,
    p_quantity_delta: payload.quantityDelta,
    p_notes:          payload.notes ?? null,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function getInventoryAdjustments(workshopId: string, page = 1) {
  const supabase = createClient()
  const from = (page - 1) * ADJUSTMENTS_PAGE_SIZE
  const to   = from + ADJUSTMENTS_PAGE_SIZE - 1
  const { data, error, count } = await supabase
    .from('inventory_adjustments')
    .select('*, parts(name, sku, unit)', { count: 'exact' })
    .eq('workshop_id', workshopId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  return { data: data ?? [], total: count ?? 0, page }
}

export async function getInventoryValuation(workshopId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inventory_stock')
    .select('quantity_on_hand, average_cost, parts!inner(id, name, sku, unit, sale_price, is_active)')
    .eq('workshop_id', workshopId)
    .eq('parts.is_active', true)
    .order('average_cost', { ascending: false })
  if (error) throw error
  return data ?? []
}

export const SUPPLIERS_PAGE_SIZE = 15

export async function getSuppliers(params?: {
  search?: string
  page?: number
  sortDir?: 'asc' | 'desc'
}) {
  const supabase  = createClient()
  const page      = params?.page    ?? 1
  const sortDir   = params?.sortDir ?? 'asc'
  const from      = (page - 1) * SUPPLIERS_PAGE_SIZE
  const to        = from + SUPPLIERS_PAGE_SIZE - 1

  let query = supabase
    .from('suppliers')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('name', { ascending: sortDir === 'asc' })
    .range(from, to)

  if (params?.search) query = query.ilike('name', `%${params.search}%`)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], total: count ?? 0, page }
}

export async function deactivateSupplier(supplierId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('suppliers').update({ is_active: false }).eq('id', supplierId)
  if (error) throw error
}

export async function updateSupplier(supplierId: string, payload: {
  name: string
  contact_name: string | null
  rfc: string | null
  phone: string | null
  email: string | null
}) {
  const supabase = createClient()
  const { error } = await supabase.from('suppliers').update(payload).eq('id', supplierId)
  if (error) throw new Error(parseDbError(error))
}
