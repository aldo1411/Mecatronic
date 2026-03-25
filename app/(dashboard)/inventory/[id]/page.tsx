'use client'
import { useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { usePartDetail } from '@/hooks/useInventory'
import { useWorkshopStore } from '@/stores/workshop.store'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Package, TrendingUp, TrendingDown } from 'lucide-react'
import { TableLoader } from '@/components/shared/Loader'

const HISTORY_SIZE = 15

export default function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { activeWorkshop } = useWorkshopStore()
  const { data: part, isLoading: partLoading } = usePartDetail(id)
  const [entriesPage, setEntriesPage] = useState(1)
  const [usagePage, setUsagePage] = useState(1)

  const stock = part?.inventory_stock?.[0]
  const qty      = stock?.quantity_on_hand ?? 0
  const avgCost  = stock?.average_cost ?? 0
  const margin   = part && avgCost > 0 ? ((part.sale_price - avgCost) / part.sale_price * 100).toFixed(1) : null

  // Entry history
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['part-entries', id, entriesPage],
    queryFn: async () => {
      const supabase = createClient()
      const from = (entriesPage - 1) * HISTORY_SIZE
      const to   = from + HISTORY_SIZE - 1
      const { data, error, count } = await supabase
        .from('inventory_entries')
        .select('id, quantity, unit_cost, invoice_ref, created_at, suppliers(name)', { count: 'exact' })
        .eq('part_id', id)
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) throw error
      return { data: data ?? [], total: count ?? 0 }
    },
    enabled: !!id,
  })

  // Usage in work orders
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['part-usage', id, usagePage],
    queryFn: async () => {
      const supabase = createClient()
      const from = (usagePage - 1) * HISTORY_SIZE
      const to   = from + HISTORY_SIZE - 1
      const { data, error, count } = await supabase
        .from('work_order_parts')
        .select('id, quantity, sale_price, created_at, work_orders(folio, state)', { count: 'exact' })
        .eq('part_id', id)
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) throw error
      return { data: data ?? [], total: count ?? 0 }
    },
    enabled: !!id,
  })

  if (partLoading) {
    return (
      <div>
        <Topbar title="Detalle de refacción" />
        <div className="p-6 flex justify-center py-20">
          <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!part) {
    return (
      <div>
        <Topbar title="Refacción no encontrada" />
        <div className="p-6">
          <Link href="/inventory" className="text-[12px] text-brand-300 hover:text-brand-200 transition-colors flex items-center gap-1">
            <ChevronLeft size={13} /> Volver al inventario
          </Link>
        </div>
      </div>
    )
  }

  const entriesTotalPages = Math.ceil((entriesData?.total ?? 0) / HISTORY_SIZE)
  const usageTotalPages   = Math.ceil((usageData?.total ?? 0) / HISTORY_SIZE)

  return (
    <div>
      <Topbar
        title={part.name}
        subtitle={part.sku ? `SKU: ${part.sku}` : undefined}
        actions={
          <Link href="/inventory" className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft size={13} /> Volver
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Stock actual" value={`${qty} ${part.unit}`} icon={<Package size={14} />}
            valueClass={qty <= 0 ? 'text-red-400' : qty <= part.min_stock ? 'text-amber-300' : 'text-brand-200'} />
          <StatCard label="Costo promedio" value={avgCost > 0 ? formatCurrency(avgCost) : '—'} />
          <StatCard label="Precio de venta" value={formatCurrency(part.sale_price)} />
          <StatCard
            label="Margen bruto"
            value={margin !== null ? `${Number(margin) >= 0 ? '+' : ''}${margin}%` : '—'}
            valueClass={margin !== null ? (Number(margin) >= 0 ? 'text-brand-200' : 'text-red-400') : undefined}
            icon={margin !== null ? (Number(margin) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />) : undefined}
          />
        </div>

        {/* Part info */}
        <div className="bg-surface-0 border border-surface-3 rounded-xl p-5">
          <p className="text-[11px] text-text-faint uppercase tracking-wider mb-3">Datos de la refacción</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12px]">
            <div><p className="text-text-faint mb-0.5">Nombre</p><p className="text-text-primary font-medium">{part.name}</p></div>
            <div><p className="text-text-faint mb-0.5">SKU</p><p className="text-text-primary">{part.sku ?? '—'}</p></div>
            <div><p className="text-text-faint mb-0.5">Unidad</p><p className="text-text-primary">{part.unit}</p></div>
            <div><p className="text-text-faint mb-0.5">Stock mínimo</p><p className="text-text-primary">{part.min_stock} {part.unit}</p></div>
            {part.description && (
              <div className="col-span-2 md:col-span-4">
                <p className="text-text-faint mb-0.5">Descripción</p>
                <p className="text-text-primary">{part.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Entry history */}
        <div>
          <p className="text-[11px] text-text-faint uppercase tracking-wider mb-3">Historial de entradas ({entriesData?.total ?? 0})</p>
          <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-surface-3">
                  {['Cantidad', 'Costo unit.', 'Total', 'Proveedor', 'Folio factura', 'Fecha'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entriesLoading ? <TableLoader cols={6} /> : (entriesData?.data ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-[12px] text-text-faint">Sin entradas registradas</td></tr>
                ) : (entriesData?.data ?? []).map((e: {
                  id: string; quantity: number; unit_cost: number; invoice_ref: string | null; created_at: string
                  suppliers?: { name: string } | null
                }) => (
                  <tr key={e.id} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 text-[12px] text-brand-300 font-medium">+{e.quantity} {part.unit}</td>
                    <td className="px-4 py-3 text-[12px] text-text-muted">{formatCurrency(e.unit_cost)}</td>
                    <td className="px-4 py-3 text-[12px] text-text-primary font-medium">{formatCurrency(e.quantity * e.unit_cost)}</td>
                    <td className="px-4 py-3 text-[12px] text-text-muted">{e.suppliers?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-text-muted">{e.invoice_ref ?? '—'}</td>
                    <td className="px-4 py-3 text-[11px] text-text-faint">{formatDateTime(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={entriesPage} totalPages={entriesTotalPages} total={entriesData?.total ?? 0} label="entradas" onPrev={() => setEntriesPage(p => p - 1)} onNext={() => setEntriesPage(p => p + 1)} />
          </div>
        </div>

        {/* Usage in work orders */}
        <div>
          <p className="text-[11px] text-text-faint uppercase tracking-wider mb-3">Uso en órdenes de servicio ({usageData?.total ?? 0})</p>
          <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-surface-3">
                  {['Folio OT', 'Estado', 'Cantidad', 'Precio venta', 'Fecha'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usageLoading ? <TableLoader cols={5} /> : (usageData?.data ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-[12px] text-text-faint">Sin uso registrado en órdenes</td></tr>
                ) : (usageData?.data ?? []).map((u: {
                  id: string; quantity: number; sale_price: number; created_at: string
                  work_orders?: { folio: string; state: string } | null
                }) => (
                  <tr key={u.id} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{u.work_orders?.folio ?? '—'}</td>
                    <td className="px-4 py-3 text-[11px] text-text-muted capitalize">{u.work_orders?.state ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-red-400 font-medium">−{u.quantity} {part.unit}</td>
                    <td className="px-4 py-3 text-[12px] text-text-primary">{formatCurrency(u.sale_price)}</td>
                    <td className="px-4 py-3 text-[11px] text-text-faint">{formatDateTime(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={usagePage} totalPages={usageTotalPages} total={usageData?.total ?? 0} label="usos" onPrev={() => setUsagePage(p => p - 1)} onNext={() => setUsagePage(p => p + 1)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, valueClass }: { label: string; value: string; icon?: React.ReactNode; valueClass?: string }) {
  return (
    <div className="bg-surface-0 border border-surface-3 rounded-xl p-4">
      <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon && <span className={valueClass ?? 'text-text-muted'}>{icon}</span>}
        <p className={`text-[18px] font-semibold ${valueClass ?? 'text-text-primary'}`}>{value}</p>
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, total, label, onPrev, onNext }: {
  page: number; totalPages: number; total: number; label: string; onPrev: () => void; onNext: () => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-3">
      <p className="text-[11px] text-text-faint">{total} {label} · página {page} de {totalPages}</p>
      <div className="flex items-center gap-1">
        <button onClick={onPrev} disabled={page === 1} className="p-1.5 text-text-faint hover:text-text-primary disabled:opacity-30 transition-colors">
          <ChevronLeft size={14} />
        </button>
        <button onClick={onNext} disabled={page >= totalPages} className="p-1.5 text-text-faint hover:text-text-primary disabled:opacity-30 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
