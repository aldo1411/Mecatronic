'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useParts, useSuppliers, useCreateInventoryEntry, useInventoryEntries, ENTRIES_PAGE_SIZE } from '@/hooks/useInventory'
import { useWorkshopStore } from '@/stores/workshop.store'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Plus, X, Loader2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { TableLoader, TableBackdrop } from '@/components/shared/Loader'
import { toast } from '@/components/shared/Toast'

export default function InventoryEntriesPage() {
  const { activeWorkshop } = useWorkshopStore()
  const { data: parts } = useParts()
  const { data: suppliers } = useSuppliers()
  const createEntry = useCreateInventoryEntry()
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ partId: '', supplierId: '', quantity: '', unitCost: '', invoiceRef: '' })

  const { data: entriesData, isLoading, isFetching } = useInventoryEntries(activeWorkshop?.id, page)
  const entries = entriesData?.data ?? []
  const total   = entriesData?.total ?? 0
  const totalPages = Math.ceil(total / ENTRIES_PAGE_SIZE)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkshop) return
    const result = await createEntry.mutateAsync({
      workshopId: activeWorkshop.id,
      partId:     form.partId,
      supplierId: form.supplierId || undefined,
      quantity:   parseFloat(form.quantity),
      unitCost:   parseFloat(form.unitCost),
      invoiceRef: form.invoiceRef || undefined,
    })
    setForm({ partId: '', supplierId: '', quantity: '', unitCost: '', invoiceRef: '' })
    setShowForm(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    if (result.alert) toast.warning(result.alert.message)
  }

  const selectedPart = parts?.find(p => p.id === form.partId)

  return (
    <div>
      <Topbar
        title="Entradas de inventario"
        subtitle="Registro de compras y reposición de refacciones"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 text-brand-100 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
          >
            <Plus size={13} /> Nueva entrada
          </button>
        }
      />

      <div className="p-6">
        {success && (
          <div className="flex items-center gap-2 bg-brand-500/20 border border-brand-400 rounded-xl px-4 py-3 mb-5 animate-fadeIn">
            <CheckCircle size={15} className="text-brand-300" />
            <p className="text-[12px] text-brand-200">Entrada registrada correctamente. Inventario actualizado.</p>
          </div>
        )}

        <div className="relative bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          <TableBackdrop visible={isFetching && !isLoading} />
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-surface-3">
                {['Refacción', 'Proveedor', 'Cantidad', 'Costo unit.', 'Total', 'Folio factura', 'Fecha'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoader cols={7} />
              ) : entries.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[12px] text-text-faint">Sin entradas registradas</td></tr>
              ) : entries.map((entry: {
                id: string; quantity: number; unit_cost: number; total_cost: number;
                invoice_ref: string | null; created_at: string;
                parts?: { name: string; sku: string | null; unit: string };
                suppliers?: { name: string }
              }) => (
                <tr key={entry.id} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[12px] font-medium text-text-primary">{entry.parts?.name ?? '—'}</p>
                    {entry.parts?.sku && <p className="text-[10px] text-text-faint">SKU: {entry.parts.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-text-muted">{entry.suppliers?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[12px] text-text-primary">{entry.quantity} {entry.parts?.unit ?? ''}</td>
                  <td className="px-4 py-3 text-[12px] text-text-muted">{formatCurrency(entry.unit_cost)}</td>
                  <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(entry.total_cost ?? entry.unit_cost * entry.quantity)}</td>
                  <td className="px-4 py-3 text-[12px] text-text-muted">{entry.invoice_ref ?? '—'}</td>
                  <td className="px-4 py-3 text-[11px] text-text-faint">{formatDateTime(entry.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-3">
              <p className="text-[11px] text-text-faint">{total} entradas · página {page} de {totalPages}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                  className="p-1.5 text-text-faint hover:text-text-primary disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                  className="p-1.5 text-text-faint hover:text-text-primary disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New entry modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-md animate-fadeIn">
            <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-text-primary">Nueva entrada de inventario</h2>
              <button onClick={() => setShowForm(false)} className="text-text-faint hover:text-text-muted transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
                <div className="bg-surface-2 rounded-lg px-3 py-2 flex gap-4 text-[11px] text-text-muted">
                  <span>Unidad: <strong className="text-text-secondary">{selectedPart.unit}</strong></span>
                  <span>Precio venta: <strong className="text-text-secondary">{formatCurrency(selectedPart.sale_price)}</strong></span>
                  <span>Stock mín: <strong className="text-text-secondary">{selectedPart.min_stock}</strong></span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Cantidad *</label>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={form.quantity}
                    onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    required placeholder="0"
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Costo unitario *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.unitCost}
                    onChange={e => setForm(p => ({ ...p, unitCost: e.target.value }))}
                    required placeholder="0.00"
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                  />
                </div>
              </div>

              {form.quantity && form.unitCost && (() => {
                const margin = selectedPart && parseFloat(form.unitCost) > 0 && selectedPart.sale_price > 0
                  ? ((selectedPart.sale_price - parseFloat(form.unitCost)) / selectedPart.sale_price) * 100
                  : null
                const negative = margin !== null && margin < 0
                return (
                  <div className={`rounded-lg px-3 py-2 text-[12px] ${negative ? 'bg-red-500/10 border border-red-400/30 text-red-400' : 'bg-brand-500/10 border border-brand-400/30 text-brand-300'}`}>
                    Total de entrada: <strong>{formatCurrency(parseFloat(form.quantity) * parseFloat(form.unitCost))}</strong>
                    {margin !== null && (
                      <span className="ml-3 font-medium">Margen: {margin.toFixed(1)}%</span>
                    )}
                  </div>
                )
              })()}

              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Proveedor</label>
                <select
                  value={form.supplierId}
                  onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                >
                  <option value="">Sin proveedor</option>
                  {(suppliers ?? []).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Folio de factura</label>
                <input
                  value={form.invoiceRef}
                  onChange={e => setForm(p => ({ ...p, invoiceRef: e.target.value }))}
                  placeholder="FAC-2025-001"
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={createEntry.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 py-2.5 rounded-lg text-[12px] font-medium transition-colors"
                >
                  {createEntry.isPending && <Loader2 size={12} className="animate-spin" />}
                  Registrar entrada
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
