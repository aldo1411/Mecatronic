'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { useParts, useLowStockAlerts, useUpdatePart, useDeactivatePart } from '@/hooks/useInventory'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, AlertTriangle, X, Loader2, Pencil, Trash2 } from 'lucide-react'
import { TableLoader, TableBackdrop } from '@/components/shared/Loader'
import { toast } from '@/components/shared/Toast'

const UNITS = ['pza', 'jgo', 'lt', 'kg', 'metro', 'par', 'caja', 'set']

type Part = {
  id: string; name: string; description: string | null; sku: string | null
  unit: string; sale_price: number; min_stock: number
  inventory_stock?: { quantity_on_hand: number; average_cost: number }[]
}

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'critical'>('all')
  const { data: parts, isLoading, isFetching } = useParts(search || undefined)
  const { data: alerts } = useLowStockAlerts()
  const updatePart = useUpdatePart()
  const deactivatePart = useDeactivatePart()
  const alertCount = alerts?.length ?? 0

  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', sku: '', unit: 'pza', sale_price: '', min_stock: '' })
  const [confirmDeactivate, setConfirmDeactivate] = useState<Part | null>(null)

  function openEdit(part: Part) {
    setEditForm({
      name:        part.name,
      description: part.description ?? '',
      sku:         part.sku ?? '',
      unit:        part.unit,
      sale_price:  String(part.sale_price),
      min_stock:   String(part.min_stock),
    })
    setEditingPart(part)
  }

  function handleSaveEdit() {
    if (!editingPart) return
    updatePart.mutate(
      {
        partId: editingPart.id,
        payload: {
          name:        editForm.name,
          description: editForm.description || null,
          sku:         editForm.sku || null,
          unit:        editForm.unit,
          sale_price:  parseFloat(editForm.sale_price) || 0,
          min_stock:   parseFloat(editForm.min_stock) || 0,
        },
      },
      {
        onSuccess: () => { toast.success('Refacción actualizada'); setEditingPart(null) },
        onError:   () => toast.error('Error al guardar'),
      }
    )
  }

  function handleDeactivate() {
    if (!confirmDeactivate) return
    deactivatePart.mutate(confirmDeactivate.id, {
      onSuccess: () => { toast.success('Refacción desactivada'); setConfirmDeactivate(null) },
      onError:   () => toast.error('Error al desactivar'),
    })
  }

  const filtered = (parts ?? []).filter((part: Part) => {
    const stock = part.inventory_stock?.[0]
    if (filter === 'low') return stock && stock.quantity_on_hand <= part.min_stock
    if (filter === 'critical') return stock && stock.quantity_on_hand <= part.min_stock * 0.5
    return true
  })

  function getStockStatus(qty: number, min: number) {
    if (qty <= 0) return { label: 'Sin inventario', barClass: 'bg-red-600', textClass: 'text-red-400', pct: 0 }
    if (qty <= min * 0.5) return { label: 'Crítico', barClass: 'bg-red-600', textClass: 'text-red-400', pct: Math.min((qty / min) * 100, 100) }
    if (qty <= min) return { label: 'Inventario bajo', barClass: 'bg-amber-500', textClass: 'text-amber-300', pct: Math.min((qty / min) * 100, 100) }
    return { label: 'OK', barClass: 'bg-brand-300', textClass: 'text-brand-200', pct: Math.min((qty / (min * 3)) * 100, 100) }
  }

  return (
    <div>
      <Topbar
        title="Inventario de refacciones"
        actions={
          <div className="flex gap-2">
            <Link href="/inventory/entries" className="px-3 py-1.5 bg-surface-2 border border-surface-3 rounded-lg text-[12px] text-text-muted hover:text-text-primary transition-colors">
              + Entrada de inventario
            </Link>
            <Link href="/inventory/new-part" className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 text-brand-100 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors">
              <Plus size={13} /> Nueva refacción
            </Link>
          </div>
        }
      />

      <div className="p-6">
        {alertCount > 0 && (
          <div className="bg-amber-950/50 border border-amber-900/50 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
            <p className="text-[12px] text-amber-300">
              {alertCount} refacción{alertCount !== 1 ? 'es' : ''} con stock por debajo del mínimo.
              <button onClick={() => setFilter('low')} className="ml-2 underline hover:no-underline">Ver solo críticos</button>
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU..."
              className="bg-surface-0 border border-surface-3 rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors w-[240px]"
            />
          </div>
          {(['all','low','critical'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                filter === f
                  ? 'bg-brand-500/30 text-brand-200 border-brand-400'
                  : 'bg-transparent text-text-muted border-surface-3 hover:border-surface-2'
              }`}
            >
              {f === 'all' ? `Todas (${parts?.length ?? 0})` : f === 'low' ? 'Inventario bajo' : 'Crítico'}
            </button>
          ))}
        </div>

        <div className="relative bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          <TableBackdrop visible={isFetching && !isLoading} />
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-surface-3">
                {['Refacción', 'Inventario actual', 'Mínimo', 'Costo prom.', 'Precio venta', 'Margen', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoader cols={7} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[12px] text-text-faint">Sin refacciones</td></tr>
              ) : filtered.map((part: Part) => {
                const stock = part.inventory_stock?.[0]
                const qty = stock?.quantity_on_hand ?? 0
                const avgCost = stock?.average_cost ?? 0
                const status = getStockStatus(qty, part.min_stock)
                const margin = part.sale_price > 0 && avgCost > 0
                  ? ((part.sale_price - avgCost) / part.sale_price * 100).toFixed(0)
                  : null
                return (
                  <tr key={part.id} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/inventory/detail?id=${part.id}`} className="text-[12px] font-medium text-text-primary hover:text-brand-300 transition-colors">{part.name}</Link>
                      {part.sku && <p className="text-[10px] text-text-faint">SKU: {part.sku}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-surface-3 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${status.barClass}`} style={{ width: `${status.pct}%` }} />
                        </div>
                        <span className={`text-[12px] font-medium ${status.textClass}`}>{qty} {part.unit}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block ${
                        status.label === 'OK' ? 'bg-brand-500 text-brand-100' :
                        status.label === 'Inventario bajo' ? 'bg-amber-950 text-amber-300' :
                        'bg-red-950 text-red-400'
                      }`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text-faint">{part.min_stock} {part.unit}</td>
                    <td className="px-4 py-3 text-[12px] text-text-muted">{avgCost > 0 ? formatCurrency(avgCost) : '—'}</td>
                    <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(part.sale_price)}</td>
                    <td className="px-4 py-3 text-[12px]">
                      {margin !== null ? (
                        <span className={Number(margin) >= 0 ? 'text-brand-200' : 'text-red-400'}>
                          {Number(margin) >= 0 ? '+' : ''}{margin}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(part)}
                          className="p-1.5 text-text-faint hover:text-text-primary transition-colors rounded-lg hover:bg-surface-2"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmDeactivate(part)}
                          className="p-1.5 text-text-faint hover:text-red-400 transition-colors rounded-lg hover:bg-surface-2"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editingPart && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-md animate-fadeIn">
            <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-text-primary">Editar refacción</h2>
              <button onClick={() => setEditingPart(null)} className="text-text-faint hover:text-text-muted transition-colors"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Nombre *', key: 'name', placeholder: 'Filtro de aceite' },
                { label: 'Descripción', key: 'description', placeholder: 'Descripción opcional' },
                { label: 'SKU / Código', key: 'sku', placeholder: 'FIL-001' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">{label}</label>
                  <input
                    value={editForm[key as keyof typeof editForm]}
                    onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Unidad *</label>
                  <select
                    value={editForm.unit}
                    onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))}
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Precio venta *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={editForm.sale_price}
                    onChange={e => setEditForm(p => ({ ...p, sale_price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Inventario mínimo</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={editForm.min_stock}
                    onChange={e => setEditForm(p => ({ ...p, min_stock: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end">
              <button onClick={() => setEditingPart(null)} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
              <button
                onClick={handleSaveEdit}
                disabled={!editForm.name || !editForm.sale_price || updatePart.isPending}
                className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
              >
                {updatePart.isPending && <Loader2 size={12} className="animate-spin" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate confirm */}
      {confirmDeactivate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-sm animate-fadeIn p-6">
            <h2 className="text-[15px] font-medium text-text-primary mb-2">¿Desactivar refacción?</h2>
            <p className="text-[12px] text-text-muted mb-5">
              <strong className="text-text-primary">{confirmDeactivate.name}</strong> no aparecerá en nuevas órdenes de servicio ni en el inventario activo.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeactivate(null)} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
              <button
                onClick={handleDeactivate}
                disabled={deactivatePart.isPending}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
              >
                {deactivatePart.isPending && <Loader2 size={12} className="animate-spin" />}
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
