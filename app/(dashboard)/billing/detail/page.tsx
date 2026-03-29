'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { InvoiceBadge } from '@/components/shared/StatusBadge'
import {
  useInvoice, useInvoiceBalance, useAddPayment, useGenerateReceiptPdf,
  useAddInvoiceItem, useDeleteInvoiceItem,
  useCancelInvoice, useServiceCatalog,
} from '@/hooks/useBilling'
import { useParts } from '@/hooks/useInventory'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useWorkshopStore } from '@/stores/workshop.store'
import { toast } from '@/components/shared/Toast'
import type { PaymentMethod } from '@/types/database'
import { Loader2, FileText, Plus, Trash2, X, Ban } from 'lucide-react'

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  spei: 'Transferencia SPEI',
  card: 'Tarjeta',
}

const EDITABLE_STATUSES = new Set(['draft', 'issued', 'partial'])

function BillingDetailPage() {
  const id = useSearchParams().get('id') ?? ''
  const router = useRouter()
  const { activeWorkshop } = useWorkshopStore()

  const { data: invoice, isLoading } = useInvoice(id)
  const { data: balance } = useInvoiceBalance(id)
  const { data: catalog } = useServiceCatalog()
  const [partSearch, setPartSearch] = useState('')
  const { data: partsData } = useParts(partSearch || undefined)
  const addPayment = useAddPayment()
  const generatePdf = useGenerateReceiptPdf()
  const addItem    = useAddInvoiceItem()
  const deleteItem = useDeleteInvoiceItem()
  const cancelInvoice = useCancelInvoice()

  // Payment form
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')

  // Modals / editing
  const [showAddService, setShowAddService] = useState(false)
  const [confirmCancel, setConfirmCancel]   = useState(false)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<string | null>(null)

  // Add-item modal
  const [addTab, setAddTab] = useState<'service' | 'part'>('service')

  // Service modal form
  const [svcMode, setSvcMode]     = useState<'catalog' | 'custom'>('catalog')
  const [selectedService, setSelectedService] = useState<{ id: string; name: string; default_price: number } | null>(null)
  const [svcSearch, setSvcSearch] = useState('')
  const [svcPage, setSvcPage]     = useState(1)
  const [customSvcDesc, setCustomSvcDesc]   = useState('')
  const [customSvcPrice, setCustomSvcPrice] = useState('')
  const [customSvcQty, setCustomSvcQty]     = useState('1')

  const SVC_PAGE_SIZE = 6

  // Part modal form
  const [partMode, setPartMode] = useState<'stock' | 'special'>('stock')
  const [selectedPart, setSelectedPart] = useState<{ id: string; name: string; sale_price: number; stock: number } | null>(null)
  const [partQty, setPartQty] = useState('1')
  const [partPrice, setPartPrice] = useState('')
  const [specialDesc, setSpecialDesc] = useState('')

  // Pre-fill balance_due into amount when it loads
  useEffect(() => {
    if (balance?.balance_due != null && amount === '') {
      setAmount(Number(balance.balance_due).toFixed(2))
    }
  }, [balance?.balance_due])

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 size={20} className="animate-spin text-text-muted" /></div>
  if (!invoice) return <div className="p-6 text-text-muted">Cobro no encontrado</div>

  const client = invoice.profiles as { name: string; last_name: string } | undefined
  const wo = invoice.work_orders as { folio: string } | undefined
  const payments = (invoice.payments ?? []) as { id: string; method: PaymentMethod; amount: number; paid_at: string; reference: string | null }[]
  const allItems = (invoice.invoice_items ?? []) as { id: string; description: string; quantity: number; unit_price: number; tax_amount: number; total: number; item_type: string; is_active: boolean }[]
  const items = invoice.status === 'cancelled'
    ? allItems.filter(i => !i.is_active)
    : allItems.filter(i => i.is_active)
  const canEdit = EDITABLE_STATUSES.has(invoice.status)

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkshop) return
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) { toast.error('Monto inválido', 'El monto debe ser mayor a $0'); return }
    const balanceDue = balance?.balance_due ?? 0
    if (parsed > balanceDue + 0.001) {
      toast.error('Monto excede el saldo', `El saldo pendiente es ${formatCurrency(balanceDue)}`)
      return
    }
    addPayment.mutate({
      invoiceId: id,
      workshopId: activeWorkshop.id,
      amount: parsed,
      method,
      reference: reference || undefined,
    }, {
      onSuccess: () => { setAmount(''); setReference('') },
      onError: (e) => toast.error('Error al registrar pago', e instanceof Error ? e.message : undefined),
    })
  }

  function handleDeleteItem(itemId: string) {
    deleteItem.mutate(itemId, {
      onSuccess: () => { setConfirmDeleteItem(null); toast.success('Item eliminado') },
      onError: () => toast.error('Error al eliminar item'),
    })
  }

  function openAddService() {
    setAddTab('service')
    setSvcMode('catalog')
    setSelectedService(null)
    setSvcSearch('')
    setSvcPage(1)
    setCustomSvcDesc('')
    setCustomSvcPrice('')
    setCustomSvcQty('1')
    setPartMode('stock')
    setSelectedPart(null)
    setPartSearch('')
    setPartQty('1')
    setPartPrice('')
    setSpecialDesc('')
    setShowAddService(true)
  }

  function selectService(s: typeof selectedService) {
    setSelectedService(s)
  }

  function handleAddService() {
    if (svcMode === 'custom') {
      if (!customSvcDesc.trim()) return
      addItem.mutate({
        invoiceId:   id,
        itemType:    'service',
        referenceId: undefined,
        description: customSvcDesc.trim(),
        quantity:    parseFloat(customSvcQty) || 1,
        unitPrice:   parseFloat(customSvcPrice) || 0,
      }, {
        onSuccess: () => { setShowAddService(false); toast.success('Servicio agregado') },
      })
      return
    }
    if (!selectedService) return
    addItem.mutate({
      invoiceId: id,
      itemType: 'service',
      referenceId: selectedService.id,
      description: selectedService.name,
      quantity: 1,
      unitPrice: selectedService.default_price,
    }, {
      onSuccess: () => {
        setSelectedService(null)
        toast.success('Servicio agregado')
      },
    })
  }

  function handleAddPart() {
    const qty = parseFloat(partQty) || 1

    if (partMode === 'stock') {
      if (!selectedPart) return
      if (qty > selectedPart.stock) {
        toast.error('Stock insuficiente', `Disponible: ${selectedPart.stock}, solicitado: ${qty}`)
        return
      }
      addItem.mutate({
        invoiceId: id,
        itemType: 'part',
        referenceId: selectedPart.id,
        description: selectedPart.name,
        quantity: qty,
        unitPrice: selectedPart.sale_price,
      }, {
        onSuccess: () => { setShowAddService(false); toast.success('Refacción agregada') },
      })
    } else {
      if (!specialDesc.trim()) return
      addItem.mutate({
        invoiceId: id,
        itemType: 'part',
        referenceId: undefined,
        description: specialDesc.trim(),
        quantity: qty,
        unitPrice: parseFloat(partPrice) || 0,
      }, {
        onSuccess: () => { setShowAddService(false); toast.success('Pedido especial agregado') },
      })
    }
  }

  function handleCancel() {
    cancelInvoice.mutate(id, {
      onSuccess: () => { setConfirmCancel(false); toast.success('Cobro cancelado') },
      onError: () => toast.error('Error al cancelar'),
    })
  }

  function handleGeneratePdf() {
    generatePdf.mutate({ invoiceId: id }, {
      onSuccess: (result) => {
        if (result?.pdf_url) window.open(result.pdf_url, '_blank')
        else toast.success('PDF generado')
      },
      onError: (e) => toast.error('Error al generar PDF', e instanceof Error ? e.message : undefined),
    })
  }

  return (
    <div>
      <Topbar
        title={invoice.folio}
        subtitle={`OT ${wo?.folio ?? '—'} · ${client ? `${client.name} ${client.last_name}` : '—'}`}
        actions={
          <div className="flex gap-2">
            {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
              <button
                onClick={() => setConfirmCancel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-red-900/50 rounded-lg text-[12px] text-red-400 hover:bg-red-950/40 transition-colors"
              >
                <Ban size={12} /> Cancelar
              </button>
            )}
            <button
              onClick={handleGeneratePdf}
              disabled={generatePdf.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-surface-3 rounded-lg text-[12px] text-text-muted hover:text-text-primary transition-colors"
            >
              {generatePdf.isPending ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
              Generar recibo
            </button>
          </div>
        }
      />

      <div className="px-5 py-2.5 border-b border-surface-3 bg-surface-0 flex items-center gap-3">
        <InvoiceBadge status={invoice.status} />
        <span className="text-text-faint text-[11px]">·</span>
        <span className="text-[12px] text-text-faint">Emitido {formatDateTime(invoice.created_at)}</span>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
              <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Conceptos</p>
              {canEdit && (
                <button
                  onClick={openAddService}
                  className="flex items-center gap-1 text-[11px] text-brand-300 hover:text-brand-200 transition-colors"
                >
                  <Plus size={11} /> Agregar
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] border-collapse">
              <thead>
                <tr className="border-b border-surface-3/50">
                  {['Descripción', 'Cant.', 'Precio unit.', canEdit ? '' : null].filter(Boolean).map(h => (
                    <th key={h as string} className="px-4 py-2 text-left text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={canEdit ? 4 : 3} className="px-4 py-6 text-center text-[12px] text-text-faint">Sin items</td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className="border-b border-surface-3/30 last:border-0">
                    <td className="px-4 py-3 text-[12px] text-text-primary">{item.description}</td>
                    <td className="px-4 py-3 text-[12px] text-text-secondary">{item.quantity}</td>
                    <td className="px-4 py-3 text-[12px] text-text-secondary">{formatCurrency(item.unit_price)}</td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <button onClick={() => setConfirmDeleteItem(item.id)} className="p-1.5 text-text-faint hover:text-red-400 transition-colors rounded hover:bg-surface-2">
                          <Trash2 size={11} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="px-4 py-3 border-t border-surface-3 space-y-1.5">
              <div className="flex justify-between text-[12px] text-text-muted"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
              <div className="flex justify-between text-[12px] text-text-muted"><span>IVA {((activeWorkshop?.tax_rate ?? 0.16) * 100).toFixed(0)}%</span><span>{formatCurrency(invoice.tax_amount)}</span></div>
              <div className="flex justify-between text-[14px] font-medium text-text-primary pt-1.5 border-t border-surface-3"><span>Total</span><span>{formatCurrency(invoice.total)}</span></div>
            </div>
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-3">
                <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Pagos registrados</p>
              </div>
              <div className="divide-y divide-surface-3/50">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-surface-2 flex items-center justify-center text-[9px] font-medium text-text-muted flex-shrink-0">
                        {p.method === 'cash' ? 'EFE' : p.method === 'spei' ? 'SPEI' : 'TDC'}
                      </div>
                      <div>
                        <p className="text-[12px] text-text-primary">{METHOD_LABELS[p.method]}</p>
                        {p.reference && <p className="text-[10px] text-text-faint">Ref: {p.reference}</p>}
                        <p className="text-[10px] text-text-faint">{formatDateTime(p.paid_at)}</p>
                      </div>
                    </div>
                    <p className="text-[13px] font-medium text-text-primary">{formatCurrency(p.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Balance */}
          <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-3">
              <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Balance</p>
            </div>
            <div className="p-4 space-y-2.5">
              <div className="flex justify-between text-[12px] text-text-muted"><span>Total</span><span>{formatCurrency(balance?.total ?? invoice.total)}</span></div>
              <div className="flex justify-between text-[12px] text-text-secondary"><span>Pagado</span><span>{formatCurrency(balance?.amount_paid ?? 0)}</span></div>
              <div className="h-px bg-surface-3" />
              <div className={`flex justify-between text-[14px] font-medium ${(balance?.balance_due ?? 0) > 0 ? 'text-amber-300' : 'text-brand-200'}`}>
                <span>Saldo pendiente</span>
                <span>{formatCurrency(balance?.balance_due ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Add payment */}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-3">
                <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Registrar pago</p>
              </div>
              <form onSubmit={handleAddPayment} className="p-4 space-y-3">
                <div>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">
                    Monto
                    {balance?.balance_due != null && (
                      <span className="ml-1 text-text-faint normal-case tracking-normal">
                        (máx. {formatCurrency(balance.balance_due)})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max={balance?.balance_due ?? undefined}
                    required
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Método</label>
                  <select
                    value={method}
                    onChange={e => setMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                  >
                    {(Object.entries(METHOD_LABELS) as [PaymentMethod, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                {method !== 'cash' && (
                  <div>
                    <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Referencia</label>
                    <input
                      type="text"
                      value={reference}
                      onChange={e => setReference(e.target.value)}
                      placeholder="Folio / últimos 4 dígitos"
                      className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={addPayment.isPending}
                  className="w-full flex items-center justify-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 rounded-lg py-2 text-[12px] font-medium transition-colors"
                >
                  {addPayment.isPending && <Loader2 size={12} className="animate-spin" />}
                  Registrar pago
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Add item modal */}
      {showAddService && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-md animate-fadeIn">
            <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-text-primary">Agregar concepto</h2>
              <button onClick={() => setShowAddService(false)} className="text-text-faint hover:text-text-muted"><X size={16} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-surface-3">
              {(['service', 'part'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAddTab(tab)}
                  className={`flex-1 py-2.5 text-[12px] font-medium transition-colors ${addTab === tab
                    ? 'text-brand-200 border-b-2 border-brand-400'
                    : 'text-text-faint hover:text-text-muted'
                    }`}
                >
                  {tab === 'service' ? 'Servicio' : 'Refacción'}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {addTab === 'service' ? (
                <>
                  {/* Catalog / Custom toggle */}
                  <div className="flex gap-1 p-1 bg-surface-2 rounded-lg">
                    {(['catalog', 'custom'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => { setSvcMode(m); setSelectedService(null); setSvcSearch(''); setSvcPage(1); setCustomSvcDesc(''); setCustomSvcPrice(''); setCustomSvcQty('1') }}
                        className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors ${svcMode === m ? 'bg-surface-0 text-text-primary shadow-sm' : 'text-text-faint hover:text-text-muted'}`}
                      >
                        {m === 'catalog' ? 'Del catálogo' : 'Personalizado'}
                      </button>
                    ))}
                  </div>

                  {svcMode === 'custom' ? (
                    <>
                      <div>
                        <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Descripción</label>
                        <input
                          type="text"
                          value={customSvcDesc}
                          onChange={e => setCustomSvcDesc(e.target.value)}
                          placeholder="Nombre del servicio"
                          className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Cantidad</label>
                          <input
                            type="number" min="1" step="1"
                            value={customSvcQty}
                            onChange={e => setCustomSvcQty(e.target.value)}
                            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Precio unitario</label>
                          <input
                            type="number" min="0" step="0.01"
                            value={customSvcPrice}
                            onChange={e => setCustomSvcPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                  <>
                  {/* Search */}
                  <input
                    type="text"
                    value={svcSearch}
                    onChange={e => { setSvcSearch(e.target.value); setSvcPage(1); setSelectedService(null) }}
                    placeholder="Buscar servicio…"
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                  />
                  {/* Service list */}
                  {(() => {
                    type SvcOption = { id: string; name: string; default_price: number }
                    const all = (catalog ?? []) as SvcOption[]
                    const filtered = svcSearch.trim()
                      ? all.filter(s => s.name.toLowerCase().includes(svcSearch.toLowerCase()))
                      : all
                    const pages = Math.ceil(filtered.length / SVC_PAGE_SIZE) || 1
                    const page = Math.min(svcPage, pages)
                    const visible = filtered.slice((page - 1) * SVC_PAGE_SIZE, page * SVC_PAGE_SIZE)
                    return (
                      <>
                        <div className="space-y-1">
                          {filtered.length === 0 ? (
                            <p className="text-[12px] text-text-faint text-center py-4">Sin servicios encontrados</p>
                          ) : visible.map(s => (
                            <button
                              key={s.id}
                              onClick={() => selectService(s)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-colors ${selectedService?.id === s.id
                                ? 'bg-brand-500/30 text-brand-200 border border-brand-400/40'
                                : 'bg-surface-2 text-text-primary hover:bg-surface-3'
                                }`}
                            >
                              <span className="font-medium">{s.name}</span>
                              <span className="text-text-faint ml-2">{formatCurrency(s.default_price)}</span>
                            </button>
                          ))}
                        </div>
                        {pages > 1 && (
                          <div className="flex items-center justify-between text-[11px] text-text-faint pt-1">
                            <button
                              disabled={page <= 1}
                              onClick={() => setSvcPage(p => p - 1)}
                              className="px-2 py-1 rounded hover:text-text-muted disabled:opacity-30 transition-colors"
                            >← Anterior</button>
                            <span>{page} / {pages}</span>
                            <button
                              disabled={page >= pages}
                              onClick={() => setSvcPage(p => p + 1)}
                              className="px-2 py-1 rounded hover:text-text-muted disabled:opacity-30 transition-colors"
                            >Siguiente →</button>
                          </div>
                        )}
                      </>
                    )
                  })()}
                  {selectedService && (
                    <div className="flex items-center justify-between px-3 py-2 bg-surface-2 rounded-lg">
                      <span className="text-[11px] text-text-faint uppercase tracking-wider">Precio</span>
                      <span className="text-[13px] font-medium text-text-primary">{formatCurrency(selectedService.default_price)}</span>
                    </div>
                  )}
                  </>
                  )}
                </>
              ) : (
                <>
                  {/* Stock / Special-order toggle */}
                  <div className="flex gap-1 p-1 bg-surface-2 rounded-lg">
                    {(['stock', 'special'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => { setPartMode(m); setSelectedPart(null); setPartSearch(''); setPartQty('1'); setPartPrice(''); setSpecialDesc('') }}
                        className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors ${partMode === m
                          ? 'bg-surface-0 text-text-primary shadow-sm'
                          : 'text-text-faint hover:text-text-muted'
                          }`}
                      >
                        {m === 'stock' ? 'Del inventario' : 'Pedido especial'}
                      </button>
                    ))}
                  </div>

                  {partMode === 'stock' ? (
                    <>
                      <div>
                        <input
                          type="text"
                          value={partSearch}
                          onChange={e => { setPartSearch(e.target.value); setSelectedPart(null) }}
                          placeholder="Buscar por nombre…"
                          className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors mb-2"
                        />
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {!partsData || partsData.length === 0 ? (
                            <p className="text-[12px] text-text-faint text-center py-4">Sin refacciones encontradas</p>
                          ) : partsData.map(p => {
                            const stockQty = (p.inventory_stock as { quantity_on_hand: number }[] | null)?.[0]?.quantity_on_hand ?? 0
                            const noStock = stockQty <= 0
                            return (
                              <button
                                key={p.id}
                                disabled={noStock}
                                onClick={() => { setSelectedPart({ id: p.id, name: p.name, sale_price: p.sale_price, stock: stockQty }); setPartPrice(String(p.sale_price)) }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-colors ${selectedPart?.id === p.id
                                  ? 'bg-brand-500/30 text-brand-200 border border-brand-400/40'
                                  : noStock
                                    ? 'bg-surface-2 text-text-faint opacity-50 cursor-not-allowed'
                                    : 'bg-surface-2 text-text-primary hover:bg-surface-3'
                                  }`}
                              >
                                <span className="font-medium">{p.name}</span>
                                {p.sku && <span className="text-text-faint ml-2 text-[10px]">{p.sku}</span>}
                                <span className="float-right text-[10px] text-text-faint">
                                  {noStock ? 'Sin stock' : `${stockQty} disp.`}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      {selectedPart && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">
                              Cantidad <span className="normal-case tracking-normal text-text-faint">(máx. {selectedPart.stock})</span>
                            </label>
                            <input
                              type="number" min="1" step="1" max={selectedPart.stock}
                              value={partQty}
                              onChange={e => setPartQty(e.target.value)}
                              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                            />
                          </div>
                          <div className="flex flex-col justify-end">
                            <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Precio unitario</label>
                            <div className="px-3 py-2 bg-surface-2 rounded-lg text-[12px] font-medium text-text-primary">
                              {formatCurrency(selectedPart.sale_price)}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Descripción</label>
                        <input
                          type="text"
                          value={specialDesc}
                          onChange={e => setSpecialDesc(e.target.value)}
                          placeholder="Nombre de la refacción"
                          className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Cantidad</label>
                          <input
                            type="number" min="1" step="1"
                            value={partQty}
                            onChange={e => setPartQty(e.target.value)}
                            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Precio unitario</label>
                          <input
                            type="number" min="0" step="0.01"
                            value={partPrice}
                            onChange={e => setPartPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="px-5 pb-5 flex gap-2 justify-end">
              <button onClick={() => setShowAddService(false)} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
              <button
                onClick={addTab === 'service' ? handleAddService : handleAddPart}
                disabled={addItem.isPending || (
                  addTab === 'service'
                    ? svcMode === 'custom' ? !customSvcDesc.trim() : !selectedService
                    : partMode === 'stock' ? !selectedPart : !specialDesc.trim()
                )}
                className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
              >
                {addItem.isPending && <Loader2 size={12} className="animate-spin" />}
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete item confirmation */}
      {confirmDeleteItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-sm animate-fadeIn p-6">
            <h2 className="text-[15px] font-medium text-text-primary mb-2">¿Eliminar item?</h2>
            <p className="text-[12px] text-text-muted mb-5">Se eliminará el concepto y se recalcularán los totales del cobro.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteItem(null)} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
              <button
                onClick={() => handleDeleteItem(confirmDeleteItem)}
                disabled={deleteItem.isPending}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
              >
                {deleteItem.isPending && <Loader2 size={12} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel invoice confirmation */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-sm animate-fadeIn p-6">
            <h2 className="text-[15px] font-medium text-text-primary mb-2">¿Cancelar cobro?</h2>
            <p className="text-[12px] text-text-muted mb-5">
              El cobro <strong className="text-text-primary">{invoice.folio}</strong> quedará cancelado. Los pagos ya registrados no se revertirán automáticamente.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmCancel(false)} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
              <button
                onClick={handleCancel}
                disabled={cancelInvoice.isPending}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
              >
                {cancelInvoice.isPending && <Loader2 size={12} className="animate-spin" />}
                Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { Suspense } from 'react'
export default function Page() {
  return <Suspense><BillingDetailPage /></Suspense>
}
