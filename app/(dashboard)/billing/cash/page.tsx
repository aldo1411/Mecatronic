'use client'
import { Topbar } from '@/components/layout/Topbar'
import { useDailyCashSummary } from '@/hooks/useBilling'
import { formatCurrency } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

type SummaryRow = {
  workshop_id: string
  method: 'cash' | 'spei' | 'card'
  day: string
  transactions: number
  total: number
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  spei: 'SPEI',
  card: 'Tarjeta',
}

function formatDay(day: string) {
  return new Date(day + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function CashSummaryPage() {
  const { data: rows, isLoading } = useDailyCashSummary()

  // Group by day
  const byDay = new Map<string, { cash: number; spei: number; card: number; txns: number }>()
  for (const row of (rows ?? []) as SummaryRow[]) {
    const cur = byDay.get(row.day) ?? { cash: 0, spei: 0, card: 0, txns: 0 }
    cur[row.method] = row.total
    cur.txns += row.transactions
    byDay.set(row.day, cur)
  }
  const days = Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]))

  // Totals
  const totals = { cash: 0, spei: 0, card: 0, txns: 0 }
  for (const [, d] of days) {
    totals.cash += d.cash
    totals.spei += d.spei
    totals.card += d.card
    totals.txns += d.txns
  }
  const grandTotal = totals.cash + totals.spei + totals.card

  return (
    <div>
      <Topbar title="Resumen de caja" subtitle="Ingresos por método de pago" />

      <div className="p-6 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Efectivo',  value: totals.cash, color: 'text-emerald-300' },
            { label: 'SPEI',      value: totals.spei, color: 'text-blue-300' },
            { label: 'Tarjeta',   value: totals.card, color: 'text-purple-300' },
            { label: 'Total',     value: grandTotal,  color: 'text-text-primary' },
          ].map(c => (
            <div key={c.label} className="bg-surface-0 border border-surface-3 rounded-xl p-4">
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">{c.label}</p>
              <p className={`text-[18px] font-semibold ${c.color}`}>{formatCurrency(c.value)}</p>
            </div>
          ))}
        </div>

        {/* Daily table */}
        <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-surface-3">
                {['Día', 'Efectivo', 'SPEI', 'Tarjeta', 'Total', 'Transacciones'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Loader2 size={16} className="animate-spin text-text-faint mx-auto" />
                  </td>
                </tr>
              ) : days.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[12px] text-text-faint">Sin movimientos registrados</td></tr>
              ) : days.map(([day, d]) => (
                <tr key={day} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-3 text-[12px] text-text-primary capitalize">{formatDay(day)}</td>
                  <td className="px-4 py-3 text-[12px] text-text-secondary">{d.cash > 0 ? formatCurrency(d.cash) : '—'}</td>
                  <td className="px-4 py-3 text-[12px] text-text-secondary">{d.spei > 0 ? formatCurrency(d.spei) : '—'}</td>
                  <td className="px-4 py-3 text-[12px] text-text-secondary">{d.card > 0 ? formatCurrency(d.card) : '—'}</td>
                  <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(d.cash + d.spei + d.card)}</td>
                  <td className="px-4 py-3 text-[12px] text-text-faint">{d.txns}</td>
                </tr>
              ))}
            </tbody>
            {days.length > 1 && (
              <tfoot>
                <tr className="border-t border-surface-3 bg-surface-1">
                  <td className="px-4 py-3 text-[12px] font-medium text-text-muted">Total</td>
                  <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(totals.cash)}</td>
                  <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(totals.spei)}</td>
                  <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(totals.card)}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-text-primary">{formatCurrency(grandTotal)}</td>
                  <td className="px-4 py-3 text-[12px] text-text-muted">{totals.txns}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
