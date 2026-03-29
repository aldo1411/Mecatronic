'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useParts, useCreateInventoryAdjustment, useInventoryAdjustments, ADJUSTMENTS_PAGE_SIZE } from '@/hooks/useInventory'
import { useWorkshopStore } from '@/stores/workshop.store'
import { formatDateTime } from '@/lib/utils'
import { Plus, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { TableLoader, TableBackdrop } from '@/components/shared/Loader'
import { toast } from '@/components/shared/Toast'
import { cn } from '@/lib/utils'

const ADJUSTMENT_TYPES = [
  { value: 'physical_count', label: 'Conteo físico',   description: 'Corrección por conteo real del inventario' },
  { value: 'shrinkage',      label: 'Merma',           description: 'Pérdida por deterioro o vencimiento' },
  { value: 'theft',          label: 'Robo',            description: 'Pérdida confirmada por robo' },
  { value: 'damage',         label: 'Daño',            description: 'Pieza dañada e inutilizable' },
  { value: 'other',          label: 'Otro',            description: 'Ajuste manual por otro motivo' },
] as const

type AdjType = typeof ADJUSTMENT_TYPES[number]['value']

const TYPE_LABELS: Record<AdjType, string> = Object.fromEntries(ADJUSTMENT_TYPES.map(t => [t.value, t.label])) as Record<AdjType, string>

export default function InventoryAdjustmentsPage() {
  const { activeWorkshop } = useWorkshopStore()
  const { data: parts } = useParts()
  const createAdj = useCreateInventoryAdjustment()
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ partId: '', type: 'physical_count' as AdjType, delta: '', notes: '' })

  const { data: adjData, isLoading, isFetching } = useInventoryAdjustments(activeWorkshop?.id, page)
  const adjustments = adjData?.data ?? []
  const total      = adjData?.total ?? 0
  const totalPages = Math.ceil(total / ADJUSTMENTS_PAGE_SIZE)

  const selectedPart = parts?.find(p => p.id === form.partId)
  const currentStock = selectedPart?.inventory_stock?.[0]?.quantity_on_hand ?? 0
  const deltaNum     = parseFloat(form.delta) || 0
  const newStock     = currentStock + deltaNum

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!activeWorkshop || !form.partId || !form.delta) return
    createAdj.mutate(
      {
        workshopId:    activeWorkshop.id,
        partId:        form.partId,
        type:          form.type,
        quantityDelta: deltaNum,
        notes:         form.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Ajuste registrado')
          setForm({ partId: '', type: 'physical_count', delta: '', notes: '' })
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div>
      <Topbar
        title="Ajustes de inventario"
        subtitle="Mermas, robos, conteos físicos y correcciones manuales"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 text-brand-100 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
          >
            <Plus size={13} /> Nuevo ajuste
          </button>
        }
      />

      <div className="p-4 md:p-6">
        <div className="relative bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          <TableBackdrop visible={isFetching && !isLoading} />
          <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] border-collapse">
            <thead>
              <tr className="border-b border-surface-3">
                {['Refacción', 'Tipo', 'Ajuste', 'Notas', 'Fecha'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoader cols={5} />
              ) : adjustments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[12px] text-text-faint">Sin ajustes registrados</td></tr>
              ) : adjustments.map((adj: {
                id: string; type: AdjType; quantity_delta: number; notes: string | null; created_at: string
                parts?: { name: string; sku: string | null; unit: string }
              }) => (
                <tr key={adj.id} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[12px] font-medium text-text-primary">{adj.parts?.name ?? '—'}</p>
                    {adj.parts?.sku && <p className="text-[10px] text-text-faint">SKU: {adj.parts.sku}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-surface-2 text-text-muted border border-surface-3">
                      {TYPE_LABELS[adj.type] ?? adj.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[13px] font-medium tabular-nums', adj.quantity_delta >= 0 ? 'text-brand-300' : 'text-red-400')}>
                      {adj.quantity_delta > 0 ? '+' : ''}{adj.quantity_delta} {adj.parts?.unit ?? ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-text-muted max-w-[200px] truncate">{adj.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-[11px] text-text-faint">{formatDateTime(adj.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-3">
              <p className="text-[11px] text-text-faint">{total} ajustes · página {page} de {totalPages}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 text-text-faint hover:text-text-primary disabled:opacity-30 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="p-1.5 text-text-faint hover:text-text-primary disabled:opacity-30 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-md animate-fadeIn">
            <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-text-primary">Nuevo ajuste de inventario</h2>
              <button onClick={() => setShowForm(false)} className="text-text-faint hover:text-text-muted transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Part */}
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Refacción *</label>
                <select
                  value={form.partId}
                  onChange={e => setForm(p => ({ ...p, partId: e.target.value }))}
                  required
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                >
                  <option value="">Seleccionar refacción...</option>
                  {(parts ?? []).map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.sku ? ` — ${p.sku}` : ''}</option>
                  ))}
                </select>
              </div>

              {selectedPart && (
                <div className="bg-surface-2 rounded-lg px-3 py-2 text-[11px] text-text-muted">
                  Stock actual: <strong className="text-text-primary">{currentStock} {selectedPart.unit}</strong>
                </div>
              )}

              {/* Type */}
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-2">Tipo de ajuste *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ADJUSTMENT_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, type: t.value }))}
                      className={cn(
                        'text-left px-3 py-2 rounded-lg border text-[11px] transition-colors',
                        form.type === t.value
                          ? 'bg-brand-500/20 border-brand-400 text-brand-200'
                          : 'bg-surface-2 border-surface-3 text-text-muted hover:border-surface-2'
                      )}
                    >
                      <p className="font-medium">{t.label}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delta */}
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">
                  Cantidad del ajuste * <span className="normal-case">(negativo para reducir)</span>
                </label>
                <input
                  type="number" step="1"
                  value={form.delta}
                  onChange={e => setForm(p => ({ ...p, delta: e.target.value }))}
                  required placeholder="-5 o +3"
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                />
              </div>

              {/* Preview */}
              {form.delta && selectedPart && (
                <div className={cn('rounded-lg px-3 py-2 text-[12px]', newStock < 0 ? 'bg-red-500/10 border border-red-400/30 text-red-400' : 'bg-surface-2 border border-surface-3 text-text-muted')}>
                  {newStock < 0
                    ? `Stock insuficiente: quedaría en ${newStock} ${selectedPart.unit}`
                    : <>Stock después del ajuste: <strong className="text-text-primary">{newStock} {selectedPart.unit}</strong></>
                  }
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Descripción del motivo del ajuste..."
                  rows={2}
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={!form.partId || !form.delta || newStock < 0 || createAdj.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 py-2.5 rounded-lg text-[12px] font-medium transition-colors"
                >
                  {createAdj.isPending && <Loader2 size={12} className="animate-spin" />}
                  Registrar ajuste
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-[12px] text-text-muted hover:text-text-primary transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
