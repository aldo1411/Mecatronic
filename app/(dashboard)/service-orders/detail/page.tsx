'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useRef, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { WorkOrderBadge } from '@/components/shared/StatusBadge'
import { Loader } from '@/components/shared/Loader'
import { Pagination } from '@/components/shared/Pagination'
import {
  useWorkOrder, useUpdateWorkOrderState, useUpdateWorkOrderMechanic,
  useWorkshopMechanics, useUploadWorkOrderPhoto, useDeleteWorkOrderPhoto,
  useHistoryNotes, HISTORY_PAGE_SIZE, useAddWorkOrderPart,
  useCancelWorkOrder, useAddHistoryNote,
} from '@/hooks/useWorkOrders'
import { useParts } from '@/hooks/useInventory'
import { useServiceCatalog, useCreateInvoiceFromWorkOrder } from '@/hooks/useBilling'
import { useWorkshopStore } from '@/stores/workshop.store'
import { toast } from '@/components/shared/Toast'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import type { WorkOrderState, WorkOrderPart, HistoryNote } from '@/types/database'
import { ChevronLeft, Camera, Plus, X, Check, Loader2, Trash2, History, Ban, Printer, Banknote, NotebookPen } from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
function photoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/work-order-photos/${path}`
}

const STATE_TRANSITIONS: Record<WorkOrderState, { label: string; next: WorkOrderState } | null> = {
  received:     { label: 'Iniciar servicio',      next: 'in_progress' },
  in_progress:  { label: 'Esperar refacción',     next: 'waiting_part' },
  waiting_part: { label: 'Marcar como listo',     next: 'ready' },
  ready:        { label: 'Registrar entrega',     next: 'delivered' },
  delivered:    null,
  cancelled:    null,
}

const ORIGIN_LABELS: Record<string, { label: string; className: string }> = {
  stock:           { label: 'Inventario', className: 'bg-brand-500 text-brand-100' },
  special_order:   { label: 'Pedido',     className: 'bg-blue-950 text-blue-300' },
  client_provided: { label: 'Cliente',    className: 'bg-surface-2 text-text-muted' },
}

const TIMELINE: { state: WorkOrderState; label: string }[] = [
  { state: 'received',     label: 'Recibido' },
  { state: 'in_progress',  label: 'En proceso' },
  { state: 'waiting_part', label: 'Esp. refacción' },
  { state: 'ready',        label: 'Listo para entrega' },
  { state: 'delivered',    label: 'Entregado' },
]
const STATE_ORDER = ['received', 'in_progress', 'waiting_part', 'ready', 'delivered']

// ─── History dialog ───────────────────────────────────────────────────────────

function HistoryDialog({
  vehicleId,
  vehicleLabel,
  onClose,
}: {
  vehicleId: string
  vehicleLabel: string
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useHistoryNotes(vehicleId, page)
  const notes  = data?.data ?? []
  const total  = data?.total ?? 0

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-medium text-text-primary">Historial del vehículo</h2>
            <p className="text-[11px] text-text-faint mt-0.5">{vehicleLabel}</p>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={18} className="animate-spin text-brand-300" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-center text-[13px] text-text-faint py-10">Sin historial registrado</p>
          ) : (
            <div className="space-y-4">
              {notes.map((note, idx) => (
                <HistoryNoteCard key={note.id} note={note} isFirst={idx === 0 && page === 1} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > HISTORY_PAGE_SIZE && (
          <div className="border-t border-surface-3 flex-shrink-0">
            <Pagination
              page={page}
              pageSize={HISTORY_PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

type HistoryNoteWithMechanic = HistoryNote & {
  work_orders?: { mechanic: { name: string; last_name: string } | null } | null
}

function HistoryNoteCard({ note, isFirst }: { note: HistoryNoteWithMechanic; isFirst: boolean }) {
  const [expanded, setExpanded] = useState(isFirst)
  const hasContent = note.diagnostic || note.services || note.notes || (note.photos?.length ?? 0) > 0
  const mechanic = (note.work_orders as { mechanic: { name: string; last_name: string } | null } | null)?.mechanic

  return (
    <div className="border border-surface-3 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-300 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-text-primary">{formatDate(note.created_at)}</p>
            {mechanic && (
              <p className="text-[11px] text-text-faint">Mecánico: {mechanic.name} {mechanic.last_name}</p>
            )}
            {note.kilometers != null && (
              <p className="text-[11px] text-text-faint">{note.kilometers.toLocaleString()} km</p>
            )}
          </div>
        </div>
        <span className="text-[11px] text-text-faint">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && hasContent && (
        <div className="px-4 pb-4 space-y-3 border-t border-surface-3/50">
          {note.diagnostic && (
            <NoteField label="Diagnóstico" value={note.diagnostic} />
          )}
          {note.services && (
            <NoteField label="Servicios realizados" value={note.services} />
          )}
          {note.notes && (
            <NoteField label="Notas" value={note.notes} />
          )}
          {(note.photos?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-2">Fotos</p>
              <div className="flex gap-2 flex-wrap">
                {note.photos!.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Foto ${i + 1}`}
                      className="w-16 h-12 object-cover rounded-lg border border-surface-3 hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NoteField({ label, value }: { label: string; value: string }) {
  return (
    <div className="pt-3">
      <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[12px] text-text-secondary whitespace-pre-wrap">{value}</p>
    </div>
  )
}

// ─── Add item modal ───────────────────────────────────────────────────────────

type PartOption = {
  id: string; name: string; sku: string | null; unit: string; sale_price: number
  inventory_stock: { quantity_on_hand: number; average_cost: number }[] | null
}
type ServiceOption = { id: string; name: string; default_price: number }

const ORIGIN_OPTIONS: { value: 'stock' | 'special_order' | 'client_provided'; label: string }[] = [
  { value: 'stock',           label: 'Inventario' },
  { value: 'special_order',   label: 'Pedido especial' },
  { value: 'client_provided', label: 'Cliente trae' },
]

const INPUT = 'w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors'

function AddItemModal({ workOrderId, onClose }: { workOrderId: string; onClose: () => void }) {
  const addPart = useAddWorkOrderPart()

  const [tab, setTab]       = useState<'part' | 'service'>('part')
  const [origin, setOrigin] = useState<'stock' | 'special_order' | 'client_provided'>('stock')

  // Part tab
  const [partSearch, setPartSearch]   = useState('')
  const [selectedPart, setSelectedPart] = useState<PartOption | null>(null)
  const [partName, setPartName]         = useState('')
  const [qty, setQty]                   = useState('1')
  const [unitCost, setUnitCost]         = useState('')
  const [salePrice, setSalePrice]       = useState('')

  // Service tab
  const [svcSearch, setSvcSearch]     = useState('')
  const [selectedSvc, setSelectedSvc] = useState<ServiceOption | null>(null)
  const [svcDesc, setSvcDesc]         = useState('')
  const [svcQty, setSvcQty]           = useState('1')
  const [svcPrice, setSvcPrice]       = useState('')

  const { data: partsRaw }   = useParts(partSearch || undefined)
  const { data: catalogRaw } = useServiceCatalog()

  const parts   = (partsRaw   ?? []) as PartOption[]
  const catalog = (catalogRaw ?? []) as ServiceOption[]

  const filteredCatalog = useMemo(() =>
    !svcSearch ? catalog : catalog.filter(s => s.name.toLowerCase().includes(svcSearch.toLowerCase()))
  , [catalog, svcSearch])

  const stock = selectedPart?.inventory_stock?.[0]

  function margin(sp: string, uc: string) {
    const s = parseFloat(sp), u = parseFloat(uc)
    if (!isNaN(s) && !isNaN(u) && u > 0) return ((s - u) / u * 100).toFixed(1)
    return null
  }
  const partMargin = margin(salePrice, unitCost)

  function selectPart(p: PartOption) {
    setSelectedPart(p)
    setSalePrice(String(p.sale_price))
    setUnitCost(String(p.inventory_stock?.[0]?.average_cost ?? 0))
  }

  function selectSvc(s: ServiceOption) {
    setSelectedSvc(s)
    setSvcDesc(s.name)
    setSvcPrice(String(s.default_price))
    setSvcSearch('')
  }

  function changeOrigin(o: typeof origin) {
    setOrigin(o)
    setSelectedPart(null); setPartSearch(''); setPartName('')
    setQty('1'); setUnitCost(''); setSalePrice('')
  }

  function handleSavePart() {
    const qtyNum = parseFloat(qty)
    if (origin === 'stock' && selectedPart && stock && qtyNum > (stock.quantity_on_hand ?? 0)) {
      toast.warning('Stock insuficiente', `Solo hay ${stock.quantity_on_hand} en inventario, se guardará de todas formas`)
    }
    const isCP = origin === 'client_provided'
    addPart.mutate({
      workOrderId,
      partId:    origin === 'stock' && selectedPart ? selectedPart.id : undefined,
      origin,
      quantity:  qtyNum,
      unitCost:  isCP ? 0 : (parseFloat(unitCost)  || 0),
      salePrice: isCP ? 0 : (parseFloat(salePrice) || 0),
      partName:  origin !== 'stock' ? partName : undefined,
    }, {
      onSuccess: () => { toast.success('Refacción agregada'); onClose() },
      onError:   (e) => toast.error('Error al agregar', e instanceof Error ? e.message : undefined),
    })
  }

  function handleSaveService() {
    addPart.mutate({
      workOrderId,
      origin:    'special_order',
      quantity:  parseFloat(svcQty) || 1,
      unitCost:  0,
      salePrice: parseFloat(svcPrice) || 0,
      partName:  svcDesc,
    }, {
      onSuccess: () => { toast.success('Servicio agregado'); onClose() },
      onError:   (e) => toast.error('Error al agregar', e instanceof Error ? e.message : undefined),
    })
  }

  const canSavePart = (() => {
    if (addPart.isPending) return false
    const n = parseFloat(qty); if (isNaN(n) || n <= 0) return false
    if (origin === 'stock')           return !!selectedPart
    if (origin === 'special_order')   return !!partName.trim()
    if (origin === 'client_provided') return !!partName.trim()
    return false
  })()
  const canSaveSvc = !addPart.isPending && !!svcDesc.trim() && parseFloat(svcQty) > 0

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-lg animate-fadeIn" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-text-primary">Agregar refacción o servicio</h2>
          <button onClick={onClose} className="text-text-faint hover:text-text-muted transition-colors"><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-3">
          {([{ value: 'part', label: 'Refacción' }, { value: 'service', label: 'Mano de obra' }] as const).map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-5 py-3 text-[12px] font-medium border-b-2 -mb-px transition-colors ${
                tab === t.value ? 'border-brand-400 text-brand-200' : 'border-transparent text-text-faint hover:text-text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {tab === 'part' ? (
            <>
              {/* Origin selector */}
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-2">Origen</label>
                <div className="flex gap-1 p-1 bg-surface-2 rounded-lg">
                  {ORIGIN_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => changeOrigin(o.value)}
                      className={`flex-1 px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                        origin === o.value ? 'bg-surface-0 text-text-primary' : 'text-text-faint hover:text-text-muted'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* INVENTARIO */}
              {origin === 'stock' && (
                <>
                  {!selectedPart ? (
                    <div>
                      <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Buscar refacción</label>
                      <input value={partSearch} onChange={e => setPartSearch(e.target.value)}
                        placeholder="Nombre o SKU..." className={INPUT} autoFocus />
                      {parts.length > 0 && (
                        <div className="mt-1 border border-surface-3 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                          {parts.map(p => {
                            const s = p.inventory_stock?.[0]
                            return (
                              <button key={p.id} onClick={() => selectPart(p)}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-2 border-b border-surface-3/40 last:border-0 transition-colors text-left"
                              >
                                <div>
                                  <p className="text-[12px] text-text-primary">{p.name}</p>
                                  {p.sku && <p className="text-[10px] text-text-faint">SKU: {p.sku}</p>}
                                </div>
                                <span className={`text-[11px] flex-shrink-0 ml-3 ${(s?.quantity_on_hand ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {s?.quantity_on_hand ?? 0} {p.unit}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-surface-2 rounded-lg border border-surface-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[12px] font-medium text-text-primary">{selectedPart.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {selectedPart.sku && <p className="text-[10px] text-text-faint">SKU: {selectedPart.sku}</p>}
                          <p className={`text-[10px] ${(stock?.quantity_on_hand ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stock?.quantity_on_hand ?? 0} en stock
                          </p>
                          <p className="text-[10px] text-text-faint">Costo prom: {formatCurrency(stock?.average_cost ?? 0)}</p>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedPart(null); setSalePrice(''); setUnitCost('') }}
                        className="text-text-faint hover:text-text-muted flex-shrink-0"><X size={13} />
                      </button>
                    </div>
                  )}
                  {selectedPart && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Cantidad *</label>
                        <input type="number" min="0.01" step="0.01" value={qty} onChange={e => setQty(e.target.value)} className={INPUT} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Precio de venta *</label>
                        <input type="number" min="0" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} className={INPUT} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Costo unitario (snapshot)</label>
                        <input type="number" value={unitCost} readOnly className={`${INPUT} opacity-50 cursor-not-allowed`} />
                      </div>
                      <div className="flex items-end pb-1">
                        {partMargin !== null && (
                          <div>
                            <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Margen</p>
                            <p className={`text-[13px] font-semibold ${parseFloat(partMargin) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {partMargin}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* PEDIDO ESPECIAL */}
              {origin === 'special_order' && (
                <>
                  <div>
                    <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Nombre / descripción *</label>
                    <input value={partName} onChange={e => setPartName(e.target.value)}
                      placeholder="Filtro de aceite, Sensor MAP..." className={INPUT} autoFocus />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Cantidad *</label>
                      <input type="number" min="0.01" step="0.01" value={qty} onChange={e => setQty(e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Costo unit.</label>
                      <input type="number" min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="0.00" className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Precio venta</label>
                      <input type="number" min="0" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="0.00" className={INPUT} />
                    </div>
                  </div>
                  {partMargin !== null && (
                    <p className={`text-[11px] font-medium ${parseFloat(partMargin) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      Margen estimado: {partMargin}%
                    </p>
                  )}
                </>
              )}

              {/* CLIENTE TRAE */}
              {origin === 'client_provided' && (
                <>
                  <div>
                    <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Descripción *</label>
                    <input value={partName} onChange={e => setPartName(e.target.value)}
                      placeholder="Ej. Amortiguadores delanteros" className={INPUT} autoFocus />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Cantidad *</label>
                    <input type="number" min="0.01" step="0.01" value={qty} onChange={e => setQty(e.target.value)}
                      className="w-32 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors" />
                  </div>
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-surface-2 rounded-lg border border-surface-3/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-faint mt-1 flex-shrink-0" />
                    <p className="text-[11px] text-text-faint">Esta refacción no afecta el inventario ni el total de la OS</p>
                  </div>
                </>
              )}
            </>
          ) : (
            /* SERVICE TAB */
            <>
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Buscar en catálogo (opcional)</label>
                <input value={svcSearch} onChange={e => setSvcSearch(e.target.value)}
                  placeholder="Cambio de aceite, alineación..." className={INPUT} />
                {filteredCatalog.length > 0 && (
                  <div className="mt-1 border border-surface-3 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                    {filteredCatalog.map(s => (
                      <button key={s.id} onClick={() => selectSvc(s)}
                        className={`w-full flex items-center justify-between px-3 py-2 hover:bg-surface-2 border-b border-surface-3/40 last:border-0 transition-colors text-left ${selectedSvc?.id === s.id ? 'bg-brand-500/20' : ''}`}
                      >
                        <p className="text-[12px] text-text-primary">{s.name}</p>
                        <p className="text-[11px] text-text-faint flex-shrink-0 ml-3">{formatCurrency(s.default_price)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Descripción *</label>
                <input value={svcDesc} onChange={e => setSvcDesc(e.target.value)}
                  placeholder="Descripción del servicio" className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Cantidad *</label>
                  <input type="number" min="0.01" step="0.01" value={svcQty} onChange={e => setSvcQty(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Precio *</label>
                  <input type="number" min="0" step="0.01" value={svcPrice} onChange={e => setSvcPrice(e.target.value)} placeholder="0.00" className={INPUT} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
          <button
            onClick={tab === 'part' ? handleSavePart : handleSaveService}
            disabled={tab === 'part' ? !canSavePart : !canSaveSvc}
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
          >
            {addPart.isPending && <Loader2 size={12} className="animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add history note modal ───────────────────────────────────────────────────

function AddHistoryNoteModal({
  vehicleId,
  workOrderId,
  onClose,
}: {
  vehicleId: string
  workOrderId: string
  onClose: () => void
}) {
  const addNote = useAddHistoryNote()
  const [form, setForm] = useState({ notes: '', diagnostic: '', services: '' })

  function handleSave() {
    addNote.mutate(
      { vehicleId, workOrderId, ...form },
      {
        onSuccess: () => {
          toast.success('Nota registrada', 'El historial del vehículo fue actualizado')
          onClose()
        },
        onError: (e) => toast.error('Error', e instanceof Error ? e.message : 'No se pudo guardar la nota'),
      }
    )
  }

  const fields: { label: string; key: keyof typeof form; placeholder: string }[] = [
    { label: 'Diagnóstico final', key: 'diagnostic', placeholder: 'Descripción del diagnóstico...' },
    { label: 'Servicio realizado', key: 'services',   placeholder: 'Servicios realizados...' },
    { label: 'Notas adicionales', key: 'notes',       placeholder: 'Observaciones...' },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-lg animate-fadeIn">
        <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-text-primary">Agregar nota de historial</h2>
          <button onClick={onClose} className="text-text-faint hover:text-text-muted transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {fields.map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">{label}</label>
              <textarea
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                rows={3}
                className={INPUT + ' resize-none'}
              />
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={addNote.isPending || (!form.notes && !form.diagnostic && !form.services)}
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
          >
            {addNote.isPending && <Loader2 size={12} className="animate-spin" />}
            Guardar nota
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ServiceOrderDetailPage() {
  const id = useSearchParams().get('id') ?? ''
  const router = useRouter()
  const { activeWorkshop, activeRole } = useWorkshopStore()
  const isMechanic = activeRole === 'mechanic'
  const { data: order, isLoading } = useWorkOrder(id)
  const updateState    = useUpdateWorkOrderState()
  const updateMechanic = useUpdateWorkOrderMechanic()
  const { data: mechanics } = useWorkshopMechanics()
  const uploadPhoto  = useUploadWorkOrderPhoto(id, activeWorkshop?.id ?? '')
  const deletePhoto  = useDeleteWorkOrderPhoto(id)
  const createInvoice = useCreateInvoiceFromWorkOrder()

  const cancelOrder  = useCancelWorkOrder()

  const [showMechanicPicker, setShowMechanicPicker] = useState(false)
  const [showHistory, setShowHistory]               = useState(false)
  const [showAddHistory, setShowAddHistory]         = useState(false)
  const [lightboxSrc, setLightboxSrc]               = useState<string | null>(null)
  const [showAddItem, setShowAddItem]               = useState(false)
  const [confirmCancel, setConfirmCancel]           = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (isLoading) return <Loader text="Cargando orden de servicio..." />
  if (!order)    return <div className="p-6 text-text-muted text-[13px]">Orden no encontrada</div>

  const client   = order.profiles  as { name: string; last_name: string; rfc?: string } | undefined
  const vehicle  = order.vehicles  as { id: string; brand: string; model: string; year: number } | undefined
  const mechanic = order.mechanics as { id: string; name: string; last_name: string } | undefined
  const parts    = (order.work_order_parts ?? []) as WorkOrderPart[]
  const photos   = (order.photos ?? []) as string[]

  const currentStateIdx = STATE_ORDER.indexOf(order.state)
  const transition      = STATE_TRANSITIONS[order.state as WorkOrderState]
  const vehicleLabel    = vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : ''

  const subtotal = parts.reduce((s, p) => s + p.sale_price * p.quantity, 0)
  const tax      = subtotal * 0.16
  const total    = subtotal + tax

  // Derivar estado del cobro directamente desde order.invoices (siempre fresco)
  type InvoiceItem = { id: string; description: string; quantity: number; unit_price: number; item_type: string; tax_amount: number; total: number; is_active: boolean }
  type InvoiceSnap  = { id: string; status: string; total: number; payments: { amount: number }[]; invoice_items?: InvoiceItem[] }
  const activeInvoices = ((order.invoices ?? []) as InvoiceSnap[]).filter(inv => inv.status !== 'cancelled')
  const hasInvoice     = activeInvoices.length > 0
  const isFullyPaid    = hasInvoice && activeInvoices.every(inv => {
    if (inv.status === 'paid') return true
    const paid = (inv.payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
    return paid >= Number(inv.total) - 0.01
  })

  const activeInvoice  = activeInvoices[0]
  const invoiceItems   = ((activeInvoice?.invoice_items ?? []) as InvoiceItem[]).filter(i => i.is_active)
  const showFromInvoice = hasInvoice

  const workOrderNotes = (order.history_notes ?? []) as { id: string }[]
  const hasWorkOrderNote   = workOrderNotes.length > 0

  const blockDelivery      = transition?.next === 'delivered' && (!hasInvoice || !isFullyPaid || !hasWorkOrderNote)
  const blockDeliveryTitle = !hasWorkOrderNote
    ? 'Registra la nota de historial antes de entregar'
    : !hasInvoice
      ? 'Genera el cobro antes de registrar la entrega'
      : !isFullyPaid
        ? 'El cobro tiene saldo pendiente — registra el pago primero'
        : undefined

  function handleStateChange() {
    if (!transition) return
    if (transition.next === 'delivered' && (!hasWorkOrderNote || !hasInvoice || !isFullyPaid)) {
      toast.error(
        !hasWorkOrderNote ? 'Sin nota de historial' : !hasInvoice ? 'Sin cobro generado' : 'Cobro pendiente',
        !hasWorkOrderNote
          ? 'Registra la nota de historial del vehículo antes de entregar.'
          : !hasInvoice
            ? 'Genera el cobro antes de registrar la entrega.'
            : 'La OS tiene un saldo pendiente. Registra el pago antes de marcarla como entregada.'
      )
      return
    }
    updateState.mutate(
      { id: order!.id, state: transition.next },
      { onSuccess: () => toast.success('Estado actualizado', `La orden pasó a "${transition.label}"`) },
    )
  }

  async function handleCobrar() {
    if (!activeWorkshop) return
    try {
      const invoice = await createInvoice.mutateAsync({ workOrderId: order!.id, workshopId: activeWorkshop.id })
      router.push(`/billing/detail?id=${invoice.id}`)
    } catch {
      toast.error('Error al generar cobro')
    }
  }

  async function handleCancelOrder() {
    try {
      await cancelOrder.mutateAsync(order!.id)
      setConfirmCancel(false)
      toast.success('Orden cancelada')
    } catch {
      toast.error('Error', 'No se pudo cancelar la orden')
    }
  }

  async function handleMechanicChange(mechanicId: string) {
    try {
      await updateMechanic.mutateAsync({ id: order!.id, mechanicId })
      setShowMechanicPicker(false)
      toast.success('Mecánico actualizado')
    } catch {
      toast.error('Error', 'No se pudo cambiar el mecánico')
    }
  }

  const MAX_PHOTOS = 5

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files    = Array.from(e.target.files ?? [])
    const slots    = MAX_PHOTOS - photos.length
    if (slots <= 0) {
      toast.error('Límite alcanzado', 'Máximo 5 fotos por orden de servicio')
      e.target.value = ''
      return
    }
    const toUpload = files.slice(0, slots)
    if (files.length > slots) {
      toast.warning('Límite alcanzado', `Solo se subirán ${slots} foto${slots !== 1 ? 's' : ''} (máximo 5 por OS)`)
    }
    toUpload.forEach(file => {
      uploadPhoto.mutate(file, {
        onError: () => toast.error('Error', `No se pudo subir ${file.name}`),
      })
    })
    e.target.value = ''
  }

  function handleDeletePhoto(path: string) {
    deletePhoto.mutate(path, {
      onError: () => toast.error('Error', 'No se pudo eliminar la foto'),
    })
  }

  return (
    <div>
      <Topbar
        title={order.folio}
        subtitle={`Creada ${formatDateTime(order.created_at)}`}
        actions={
          <div className="flex gap-2">
            <Link href="/service-orders" className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors">
              <ChevronLeft size={13} /> Volver
            </Link>
            {!isMechanic && order.state !== 'cancelled' && order.state !== 'delivered' && (
              <button
                onClick={() => setConfirmCancel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950 border border-red-800 hover:bg-red-900 text-red-400 rounded-lg text-[12px] transition-colors"
              >
                <Ban size={13} /> Cancelar
              </button>
            )}
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-surface-3 rounded-lg text-[12px] text-text-muted hover:text-text-primary transition-colors">
              <Printer size={13} /> Imprimir
            </button>
            {order.state === 'ready' && !hasWorkOrderNote && (
              <button
                onClick={() => setShowAddHistory(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950 border border-amber-800 hover:bg-amber-900 text-amber-400 rounded-lg text-[12px] font-medium transition-colors"
              >
                <NotebookPen size={13} /> Agregar historial
              </button>
            )}
            {!isMechanic && order.state === 'ready' && hasWorkOrderNote && (
              <button
                onClick={handleCobrar}
                disabled={createInvoice.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 border border-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-emerald-400 rounded-lg text-[12px] font-medium transition-colors"
              >
                {createInvoice.isPending ? <Loader2 size={13} className="animate-spin" /> : <Banknote size={13} />}
                Cobrar
              </button>
            )}
            {transition && transition.next !== 'delivered' && (
              <button
                onClick={handleStateChange}
                disabled={updateState.isPending || blockDelivery}
                title={blockDeliveryTitle}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-40 disabled:cursor-not-allowed text-brand-100 rounded-lg text-[12px] font-medium transition-colors"
              >
                {updateState.isPending ? '...' : transition.label}
              </button>
            )}
          </div>
        }
      />

      {/* Status bar */}
      <div className="px-6 py-2.5 border-b border-surface-3 bg-surface-0 flex items-center gap-3">
        <WorkOrderBadge state={order.state} />
        <span className="text-text-faint text-[11px]">·</span>
        <span className="text-[12px] text-text-faint">Entrega est. {formatDate(order.estimated_delivery)}</span>
        <span className="text-text-faint text-[11px]">·</span>
        <span className="text-[12px] font-mono text-text-faint">{order.folio}</span>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-4">
          {/* Main */}
          <div className="col-span-2 space-y-4">
            {/* Vehicle & client */}
            <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
                <p className="text-[11px] font-medium text-text-faint uppercase tracking-wider">Vehículo</p>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-1 text-[11px] text-brand-300 hover:text-brand-200 transition-colors"
                >
                  <History size={11} /> Ver historial
                </button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                {[
                  { label: 'Vehículo', value: vehicleLabel || '—' },
                  { label: 'Cliente',  value: client  ? `${client.name} ${client.last_name}` : '—' },
                  { label: 'RFC cliente', value: client?.rfc ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-[13px] text-text-primary">{value}</p>
                  </div>
                ))}
                <div className="col-span-2">
                  <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Diagnóstico</p>
                  <p className="text-[13px] text-text-secondary">{order.description ?? '—'}</p>
                </div>
              </div>

              {/* Fotos de ingreso */}
              <div className="px-4 pb-4">
                <p className="text-[10px] text-text-faint uppercase tracking-wider mb-2">Fotos de ingreso</p>
                <div className="flex gap-2 flex-wrap">
                  {photos.map(path => (
                    <div key={path} className="relative group w-20 h-14 flex-shrink-0">
                      <img
                        src={photoUrl(path)}
                        alt="Foto ingreso"
                        onClick={() => setLightboxSrc(photoUrl(path))}
                        className="w-full h-full object-cover rounded-lg border border-surface-3 cursor-pointer hover:opacity-90 transition-opacity"
                      />
                      <button
                        onClick={() => handleDeletePhoto(path)}
                        disabled={deletePhoto.isPending}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:cursor-not-allowed"
                      >
                        {deletePhoto.isPending ? (
                          <Loader2 size={10} className="animate-spin text-white" />
                        ) : (
                          <Trash2 size={10} className="text-white" />
                        )}
                      </button>
                    </div>
                  ))}

                  {/* Upload button — hidden when limit reached */}
                  {photos.length < MAX_PHOTOS && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadPhoto.isPending}
                      className="w-20 h-14 bg-surface-2 border border-dashed border-surface-3 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-brand-400 hover:bg-surface-2/80 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {uploadPhoto.isPending ? (
                        <Loader2 size={13} className="animate-spin text-brand-300" />
                      ) : (
                        <Camera size={13} className="text-text-faint" />
                      )}
                      <span className="text-[9px] text-text-faint">
                        {uploadPhoto.isPending ? 'Subiendo...' : `${photos.length}/${MAX_PHOTOS}`}
                      </span>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </div>

            {/* Parts / Invoice items */}
            <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
                <p className="text-[11px] font-medium text-text-faint uppercase tracking-wider">Refacciones y servicios</p>
                {!isMechanic && hasInvoice && (
                  <Link
                    href={`/billing/detail?id=${activeInvoice!.id}`}
                    className="flex items-center gap-1 text-[11px] text-brand-300 hover:text-brand-200 transition-colors"
                  >
                    Gestionar en cobro →
                  </Link>
                )}
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-surface-3/50">
                    {['Descripción', showFromInvoice ? 'Tipo' : 'Origen', 'Cant.', 'Precio unit.', 'Total'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {showFromInvoice ? (
                    invoiceItems.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-[12px] text-text-faint">Sin conceptos en el cobro</td></tr>
                    ) : invoiceItems.map(item => (
                      <tr key={item.id} className="border-b border-surface-3/30 last:border-0">
                        <td className="px-4 py-3 text-[12px] text-text-primary">{item.description}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.item_type === 'service' ? 'bg-purple-950 text-purple-300' : 'bg-brand-500 text-brand-100'}`}>
                            {item.item_type === 'service' ? 'Servicio' : 'Refacción'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-text-secondary">{item.quantity}</td>
                        <td className="px-4 py-3 text-[12px] text-text-secondary">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(item.total)}</td>
                      </tr>
                    ))
                  ) : (
                    parts.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-[12px] text-text-faint">Sin refacciones registradas</td></tr>
                    ) : parts.map(part => {
                      const origin = ORIGIN_LABELS[part.origin] ?? ORIGIN_LABELS.stock
                      return (
                        <tr key={part.id} className="border-b border-surface-3/30 last:border-0">
                          <td className="px-4 py-3 text-[12px] text-text-primary">
                            {part.part_name ?? (part.parts as { name: string } | undefined)?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${origin.className}`}>{origin.label}</span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-text-secondary">{part.quantity}</td>
                          <td className="px-4 py-3 text-[12px] text-text-secondary">{formatCurrency(part.sale_price)}</td>
                          <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(part.sale_price * part.quantity)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-surface-3 space-y-1.5">
                {showFromInvoice ? (
                  <>
                    <div className="flex justify-between text-[12px] text-text-muted"><span>Subtotal</span><span>{formatCurrency(invoiceItems.reduce((s, i) => s + i.quantity * i.unit_price, 0))}</span></div>
                    <div className="flex justify-between text-[12px] text-text-muted"><span>IVA 16%</span><span>{formatCurrency(invoiceItems.reduce((s, i) => s + i.tax_amount, 0))}</span></div>
                    <div className="flex justify-between text-[14px] font-medium text-text-primary pt-1.5 border-t border-surface-3">
                      <span>Total</span><span>{formatCurrency(invoiceItems.reduce((s, i) => s + i.total, 0))}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-[12px] text-text-muted"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-between text-[12px] text-text-muted"><span>IVA 16%</span><span>{formatCurrency(tax)}</span></div>
                    <div className="flex justify-between text-[14px] font-medium text-text-primary pt-1.5 border-t border-surface-3">
                      <span>Total</span><span>{formatCurrency(total)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Mechanic */}
            <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
                <p className="text-[11px] font-medium text-text-faint uppercase tracking-wider">Mecánico</p>
                {!isMechanic && (
                  <button
                    onClick={() => setShowMechanicPicker(!showMechanicPicker)}
                    className="text-[11px] text-brand-300 hover:text-brand-200 transition-colors"
                  >
                    {showMechanicPicker ? 'Cancelar' : 'Cambiar'}
                  </button>
                )}
              </div>
              <div className="p-4">
                {mechanic ? (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-950 flex items-center justify-center text-[11px] font-medium text-purple-300 flex-shrink-0">
                      {mechanic.name[0]}{mechanic.last_name[0]}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-text-primary">{mechanic.name} {mechanic.last_name}</p>
                      <p className="text-[11px] text-text-faint">Mecánico</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-text-faint">Sin mecánico asignado</p>
                )}
                {showMechanicPicker && (
                  <div className="mt-3 border border-surface-3 rounded-lg overflow-hidden">
                    {!mechanics || mechanics.length === 0 ? (
                      <p className="px-3 py-2 text-[12px] text-text-faint">Sin mecánicos registrados</p>
                    ) : mechanics.map((m) => {
                      if (!m) return null
                      const mProfile = m as { id: string; name: string; last_name: string }
                      const isSelected = mProfile.id === mechanic?.id
                      return (
                        <button
                          key={mProfile.id}
                          onClick={() => handleMechanicChange(mProfile.id)}
                          disabled={updateMechanic.isPending}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-2 border-b border-surface-3/50 last:border-0 transition-colors text-left disabled:opacity-50"
                        >
                          <span className="text-[12px] text-text-primary">{mProfile.name} {mProfile.last_name}</span>
                          {isSelected && <Check size={12} className="text-brand-300" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-3">
                <p className="text-[11px] font-medium text-text-faint uppercase tracking-wider">Estado de la OS</p>
              </div>
              <div className="p-4 space-y-4">
                {TIMELINE.map((item, idx) => {
                  const itemIdx   = STATE_ORDER.indexOf(item.state)
                  const isDone    = itemIdx < currentStateIdx
                  const isCurrent = itemIdx === currentStateIdx
                  return (
                    <div key={item.state} className="flex items-start gap-3 relative">
                      {idx < TIMELINE.length - 1 && (
                        <div className="absolute left-[5.5px] top-3.5 w-px h-full bg-surface-3" />
                      )}
                      <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 relative z-10 ${
                        isDone    ? 'bg-brand-300' :
                        isCurrent ? 'bg-amber-400'  :
                        'bg-surface-2 border border-surface-3'
                      }`} />
                      <div>
                        <p className={`text-[12px] font-medium ${
                          isDone    ? 'text-text-secondary' :
                          isCurrent ? 'text-amber-300' :
                          'text-text-faint'
                        }`}>{item.label}</p>
                        {isCurrent && <p className="text-[10px] text-text-faint mt-0.5">Estado actual</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add item modal */}
      {showAddItem && (
        <AddItemModal workOrderId={id} onClose={() => setShowAddItem(false)} />
      )}

      {/* Cancel confirmation */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Ban size={16} />
              <p className="text-[14px] font-medium">Cancelar orden de servicio</p>
            </div>
            <p className="text-[13px] text-text-secondary">
              ¿Estás seguro de que quieres cancelar la orden <span className="font-medium text-text-primary">{order.folio}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmCancel(false)}
                className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelOrder.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-950 border border-red-800 hover:bg-red-900 disabled:opacity-50 text-red-400 rounded-lg text-[12px] font-medium transition-colors"
              >
                {cancelOrder.isPending && <Loader2 size={12} className="animate-spin" />}
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History dialog */}
      {showHistory && vehicle && (
        <HistoryDialog
          vehicleId={vehicle.id}
          vehicleLabel={vehicleLabel}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Add history note modal */}
      {showAddHistory && vehicle && (
        <AddHistoryNoteModal
          vehicleId={vehicle.id}
          workOrderId={order.id}
          onClose={() => setShowAddHistory(false)}
        />
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <X size={24} />
          </button>
          <img
            src={lightboxSrc}
            alt="Foto ampliada"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

import { Suspense } from 'react'
export default function Page() {
  return <Suspense><ServiceOrderDetailPage /></Suspense>
}
