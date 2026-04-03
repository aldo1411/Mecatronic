'use client'
import { Topbar } from '@/components/layout/Topbar'
import { useInventoryValuation, useInventoryRealtime } from '@/hooks/useInventory'
import { useWorkshopStore } from '@/stores/workshop.store'
import { formatCurrency } from '@/lib/utils'
import { TableLoader } from '@/components/shared/Loader'
import { TrendingUp } from 'lucide-react'

export default function InventoryValuationPage() {
  const { activeWorkshop } = useWorkshopStore()
  const { data: rows, isLoading } = useInventoryValuation(activeWorkshop?.id)

  useInventoryRealtime(activeWorkshop?.id)

  const totalCost  = (rows ?? []).reduce((acc, r) => acc + (r.quantity_on_hand * r.average_cost), 0)
  const totalSale  = (rows ?? []).reduce((acc, r) => {
    const part = (r.parts as unknown as { sale_price: number }[] | null)?.[0]
    return acc + (r.quantity_on_hand * (part?.sale_price ?? 0))
  }, 0)
  const totalMargin = totalSale > 0 ? ((totalSale - totalCost) / totalSale * 100).toFixed(1) : null

  return (
    <div>
      <Topbar
        title="Valuación de inventario"
        subtitle="Valor total del stock actual por refacción"
      />

      <div className="p-4 md:p-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-0 border border-surface-3 rounded-xl p-4">
            <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Valor a costo</p>
            <p className="text-[20px] font-semibold text-text-primary">{formatCurrency(totalCost)}</p>
            <p className="text-[11px] text-text-faint mt-0.5">Basado en costo promedio ponderado</p>
          </div>
          <div className="bg-surface-0 border border-surface-3 rounded-xl p-4">
            <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Valor a precio venta</p>
            <p className="text-[20px] font-semibold text-brand-200">{formatCurrency(totalSale)}</p>
            <p className="text-[11px] text-text-faint mt-0.5">Si se vendiera todo al precio actual</p>
          </div>
          <div className="bg-surface-0 border border-surface-3 rounded-xl p-4">
            <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Margen bruto estimado</p>
            <div className="flex items-center gap-1.5">
              {totalMargin !== null && <TrendingUp size={16} className={Number(totalMargin) >= 0 ? 'text-brand-300' : 'text-red-400'} />}
              <p className={`text-[20px] font-semibold ${totalMargin !== null && Number(totalMargin) < 0 ? 'text-red-400' : 'text-brand-200'}`}>
                {totalMargin !== null ? `${Number(totalMargin) >= 0 ? '+' : ''}${totalMargin}%` : '—'}
              </p>
            </div>
            <p className="text-[11px] text-text-faint mt-0.5">{rows?.length ?? 0} refacciones con stock</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-surface-3">
                {['Refacción', 'Unidad', 'Stock', 'Costo prom.', 'Precio venta', 'Margen', 'Valor a costo', 'Valor a venta'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoader cols={8} />
              ) : !rows || rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[12px] text-text-faint">Sin refacciones con stock</td></tr>
              ) : rows.map((r, i) => {
                const part       = (r.parts as unknown as { id: string; name: string; sku: string | null; unit: string; sale_price: number }[] | null)?.[0]
                const valueCost  = r.quantity_on_hand * r.average_cost
                const valueSale  = r.quantity_on_hand * (part?.sale_price ?? 0)
                const rowMargin  = part?.sale_price && r.average_cost > 0
                  ? ((part.sale_price - r.average_cost) / part.sale_price * 100).toFixed(1)
                  : null
                return (
                  <tr key={i} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-medium text-text-primary">{part?.name ?? '—'}</p>
                      {part?.sku && <p className="text-[10px] text-text-faint">SKU: {part.sku}</p>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text-muted">{part?.unit ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-text-primary">{r.quantity_on_hand}</td>
                    <td className="px-4 py-3 text-[12px] text-text-muted">{r.average_cost > 0 ? formatCurrency(r.average_cost) : '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-text-muted">{part?.sale_price ? formatCurrency(part.sale_price) : '—'}</td>
                    <td className="px-4 py-3 text-[12px]">
                      {rowMargin !== null ? (
                        <span className={Number(rowMargin) >= 0 ? 'text-brand-200' : 'text-red-400'}>
                          {Number(rowMargin) >= 0 ? '+' : ''}{rowMargin}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(valueCost)}</td>
                    <td className="px-4 py-3 text-[12px] font-medium text-brand-200">{formatCurrency(valueSale)}</td>
                  </tr>
                )
              })}
            </tbody>
            {rows && rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-surface-3 bg-surface-2/50">
                  <td colSpan={6} className="px-4 py-3 text-[11px] font-medium text-text-muted uppercase tracking-wider">Total</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-text-primary">{formatCurrency(totalCost)}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-brand-200">{formatCurrency(totalSale)}</td>
                </tr>
              </tfoot>
            )}
          </table>
          </div>
        </div>
      </div>
    </div>
  )
}
