import { createClient } from '@/lib/supabase/client'

export const INVOICES_PAGE_SIZE = 25

export async function getInvoices(params?: {
  page?: number
  status?: string
  dateFrom?: string
  dateTo?: string
  workshopId?: string
  search?: string
}) {
  const supabase = createClient()
  const page = params?.page ?? 1
  const from = (page - 1) * INVOICES_PAGE_SIZE
  const to   = from + INVOICES_PAGE_SIZE - 1

  let query = supabase
    .from('invoices')
    .select('*, profiles!invoices_client_id_fkey(id, name, last_name), work_orders(id, folio)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params?.workshopId) query = query.eq('workshop_id', params.workshopId)
  if (params?.status)     query = query.eq('status', params.status)
  if (params?.dateFrom)   query = query.gte('created_at', params.dateFrom)
  if (params?.dateTo)     query = query.lte('created_at', params.dateTo + 'T23:59:59')

  if (params?.search) {
    const s = `%${params.search}%`
    const { data: matchingWOs } = await supabase
      .from('work_orders')
      .select('id')
      .ilike('folio', s)
    const woIds = (matchingWOs ?? []).map(wo => wo.id)
    if (woIds.length > 0) {
      query = query.or(`folio.ilike.${s},work_order_id.in.(${woIds.join(',')})`)
    } else {
      query = query.ilike('folio', s)
    }
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], total: count ?? 0, page }
}

export async function getInvoice(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      profiles!invoices_client_id_fkey(name, last_name, rfc),
      work_orders(folio, vehicles(brand, model, year)),
      invoice_items(*),
      payments(*)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getInvoiceBalance(invoiceId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoice_balance')
    .select('*')
    .eq('invoice_id', invoiceId)
    .single()
  if (error) throw error
  return data
}

export async function createInvoiceFromWorkOrder(payload: {
  workOrderId: string
  workshopId: string
}) {
  const supabase = createClient()

  // 1. Si existe un invoice activo, devolverlo directamente
  const { data: active } = await supabase
    .from('invoices')
    .select('id')
    .eq('work_order_id', payload.workOrderId)
    .neq('status', 'cancelled')
    .maybeSingle()
  if (active) return active

  // 2. Si existe un invoice cancelado, reactivarlo
  const { data: cancelled } = await supabase
    .from('invoices')
    .select('id')
    .eq('work_order_id', payload.workOrderId)
    .eq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fetch workshop tax_rate
  const { data: workshop } = await supabase
    .from('workshops')
    .select('tax_rate')
    .eq('id', payload.workshopId)
    .single()
  const taxRate = workshop?.tax_rate ?? 0.16

  if (cancelled) {
    const { data: woParts } = await supabase
      .from('work_order_parts')
      .select('*, parts(name)')
      .eq('work_order_id', payload.workOrderId)

    const items = (woParts ?? []).map(p => ({
      description:  p.parts?.name ?? 'Refacción',
      quantity:     p.quantity,
      unit_price:   p.sale_price,
      tax_rate:     taxRate,
      item_type:    'part' as const,
      reference_id: p.id,
    }))

    const subtotal  = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const taxAmount = subtotal * taxRate

    // Eliminar pagos anteriores (el invoice arranca limpio)
    await supabase.from('payments').delete().eq('invoice_id', cancelled.id)

    const { error: updError } = await supabase
      .from('invoices')
      .update({ status: 'issued', subtotal, tax_amount: taxAmount, issued_at: new Date().toISOString() })
      .eq('id', cancelled.id)
    if (updError) throw updError

    if (items.length > 0) {
      await supabase.from('invoice_items').insert(
        items.map(i => ({ ...i, invoice_id: cancelled.id }))
      )
    }

    return cancelled
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Look up work order to get client_id + resolve profile id for created_by FK
  const [{ data: wo, error: woError }, { data: creatorProfile }] = await Promise.all([
    supabase.from('work_orders').select('client_id').eq('id', payload.workOrderId).single(),
    user ? supabase.from('profiles').select('id').eq('auth_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  if (woError) throw woError

  const { data: folio, error: folioError } = await supabase
    .rpc('generate_folio', { p_workshop_id: payload.workshopId, p_type: 'REC' })
  if (folioError) throw folioError

  const { data: woParts } = await supabase
    .from('work_order_parts')
    .select('*, parts(name)')
    .eq('work_order_id', payload.workOrderId)

  const items = (woParts ?? []).map(p => ({
    description:  p.parts?.name ?? 'Refacción',
    quantity:     p.quantity,
    unit_price:   p.sale_price,
    tax_rate:     taxRate,
    item_type:    'part' as const,
    reference_id: p.id,
  }))

  const subtotal  = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmount = subtotal * taxRate

  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      workshop_id:   payload.workshopId,
      work_order_id: payload.workOrderId,
      client_id:     wo.client_id,
      folio:         folio as string,
      status:        'issued',
      subtotal,
      tax_amount:    taxAmount,
      issued_at:     new Date().toISOString(),
      created_by:    creatorProfile?.id ?? null,
    })
    .select()
    .single()

  if (invError) {
    // Unique constraint violation — concurrent request already created it
    if (invError.code === '23505') {
      const { data: fallback } = await supabase
        .from('invoices')
        .select('id')
        .eq('work_order_id', payload.workOrderId)
        .neq('status', 'cancelled')
        .maybeSingle()
      if (fallback) return fallback
    }
    throw invError
  }

  if (items.length > 0) {
    await supabase.from('invoice_items').insert(
      items.map(i => ({ ...i, invoice_id: invoice.id }))
    )
  }

  return invoice
}

export async function addInvoiceItem(payload: {
  invoiceId: string
  itemType: 'service' | 'part'
  referenceId?: string
  description: string
  quantity: number
  unitPrice: number
}) {
  const supabase = createClient()
  const { error } = await supabase.rpc('add_invoice_item', {
    p_invoice_id:   payload.invoiceId,
    p_item_type:    payload.itemType,
    p_reference_id: payload.referenceId ?? null,
    p_description:  payload.description,
    p_quantity:     payload.quantity,
    p_unit_price:   payload.unitPrice,
    p_tax_rate:     null,
  })
  if (error) throw new Error(error.message)
}

export async function updateInvoiceItem(payload: {
  itemId: string
  quantity: number
  unitPrice: number
}) {
  const supabase = createClient()
  const { error } = await supabase.rpc('update_invoice_item', {
    p_item_id:    payload.itemId,
    p_quantity:   payload.quantity,
    p_unit_price: payload.unitPrice,
  })
  if (error) throw new Error(error.message)
}

export async function deleteInvoiceItem(itemId: string) {
  const supabase = createClient()
  const { error } = await supabase.rpc('delete_invoice_item', { p_item_id: itemId })
  if (error) throw new Error(error.message)
}

export async function cancelInvoice(invoiceId: string) {
  const supabase = createClient()
  const { error } = await supabase.rpc('cancel_invoice', { p_invoice_id: invoiceId })
  if (error) throw error
}

export async function addPayment(payload: {
  invoiceId: string
  workshopId: string
  amount: number
  method: 'cash' | 'spei' | 'card'
  reference?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: creatorProfile } = user
    ? await supabase.from('profiles').select('id').eq('auth_id', user.id).maybeSingle()
    : { data: null }

  const { data, error } = await supabase.rpc('register_payment', {
    p_invoice_id:  payload.invoiceId,
    p_workshop_id: payload.workshopId,
    p_amount:      payload.amount,
    p_method:      payload.method,
    p_reference:   payload.reference ?? null,
    p_created_by:  creatorProfile?.id ?? null,
  })
  if (error) throw new Error(error.message)
  return data as { payment_id: string; new_status: string; balance_due: number }
}

export async function generateReceiptPdf(invoiceId: string, paymentId?: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-receipt-pdf`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ invoiceId, paymentId }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Failed to generate PDF')
  }
  return res.json() as Promise<{ pdf_url: string }>
}

export async function getServiceCatalog(workshopId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_catalog')
    .select('id, name, description, default_price')
    .eq('workshop_id', workshopId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data ?? []
}

export const CASH_PAGE_SIZE = 20

export async function getDailyCashSummary(workshopId: string, params?: { from?: string; to?: string; page?: number }) {
  const supabase = createClient()
  const page = params?.page ?? 1
  const from = (page - 1) * CASH_PAGE_SIZE
  const to   = from + CASH_PAGE_SIZE - 1
  let query = supabase
    .from('daily_cash_summary')
    .select('*', { count: 'exact' })
    .eq('workshop_id', workshopId)
    .order('day', { ascending: false })
    .range(from, to)
  if (params?.from) query = query.gte('day', params.from)
  if (params?.to)   query = query.lte('day', params.to)
  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], total: count ?? 0 }
}
