'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useDailyCashSummary } from '@/hooks/useBilling'
import { Pagination } from '@/components/shared/Pagination'
import { formatCurrency } from '@/lib/utils'
import { CASH_PAGE_SIZE } from '@/services/billing'
import { Loader2, CalendarDays } from 'lucide-react'

type SummaryRow = {
  workshop_id: string
  method: 'cash' | 'spei' | 'card'
  day: string
  transactions: number
  total: number
}

function formatDay(day: string) {
  return new Date(day + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })
}

function monthRange(ym: string): { from: string; to: string } {
  const [year, month] = ym.split('-').map(Number)
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function currentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

function buildTotals(rows: SummaryRow[]) {
  const byDay = new Map<string, { cash: number; spei: number; card: number; txns: number }>()
  for (const row of rows) {
    const cur = byDay.get(row.day) ?? { cash: 0, spei: 0, card: 0, txns: 0 }
    cur[row.method] = row.total
    cur.txns += row.transactions
    byDay.set(row.day, cur)
  }
  const days = Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  const totals = { cash: 0, spei: 0, card: 0, txns: 0 }
  for (const [, d] of days) {
    totals.cash += d.cash
    totals.spei += d.spei
    totals.card += d.card
    totals.txns += d.txns
  }
  return { days, totals }
}

const MONTHS = [
  { value: '01', label: 'Enero'      },
  { value: '02', label: 'Febrero'    },
  { value: '03', label: 'Marzo'      },
  { value: '04', label: 'Abril'      },
  { value: '05', label: 'Mayo'       },
  { value: '06', label: 'Junio'      },
  { value: '07', label: 'Julio'      },
  { value: '08', label: 'Agosto'     },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre'    },
  { value: '11', label: 'Noviembre'  },
  { value: '12', label: 'Diciembre'  },
]

const CURRENT_YEAR = new Date().getFullYear()

const selectClass = 'bg-surface-0 border border-surface-3 rounded-lg px-2.5 py-1.5 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors'

export default function CashSummaryPage() {
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear,  setFilterYear]  = useState('')
  const [tablePage,   setTablePage]   = useState(1)

  const currentYM  = currentYearMonth()
  const monthRange_ = monthRange(currentYM)

  // Cards: always current month
  const { data: monthRows, isLoading: loadingCards } = useDailyCashSummary(monthRange_)

  // Table: filtered by selected month+year or all history
  const hasFilter   = filterMonth && filterYear
  const tableParams = hasFilter
    ? { ...monthRange(`${filterYear}-${filterMonth}`), page: tablePage }
    : { page: tablePage }
  const { data: tableResult, isLoading: loadingTable } = useDailyCashSummary(tableParams)

  const { totals } = buildTotals((monthRows?.data ?? []) as SummaryRow[])
  const { days }   = buildTotals((tableResult?.data ?? []) as SummaryRow[])
  const tableTotal = tableResult?.total ?? 0

  const grandTotal = totals.cash + totals.spei + totals.card

  return (
    <div>
      <Topbar title="Resumen de caja" subtitle="Ingresos por método de pago" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Summary cards — current month */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={13} className="text-text-faint" />
            <span className="text-[11px] text-text-faint capitalize">
              Resumen del mes actual — {currentMonthLabel()}
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {loadingCards ? (
              <div className="col-span-4 flex justify-center py-6">
                <Loader2 size={16} className="animate-spin text-text-faint" />
              </div>
            ) : (
              [
                { label: 'Efectivo', value: totals.cash, color: 'text-emerald-300' },
                { label: 'SPEI',     value: totals.spei, color: 'text-blue-300'    },
                { label: 'Tarjeta',  value: totals.card, color: 'text-purple-300'  },
                { label: 'Total',    value: grandTotal,  color: 'text-text-primary' },
              ].map(c => (
                <div key={c.label} className="bg-surface-0 border border-surface-3 rounded-xl p-4">
                  <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">{c.label}</p>
                  <p className={`text-[18px] font-semibold ${c.color}`}>{formatCurrency(c.value)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Historical table */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <span className="text-[11px] text-text-faint">Movimientos por día</span>
            <div className="flex items-center gap-2 flex-wrap">
              <CalendarDays size={13} className="text-text-faint" />
              <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setTablePage(1) }} className={selectClass}>
                <option value="">Mes</option>
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <input
                type="number"
                value={filterYear}
                min={2024}
                max={CURRENT_YEAR}
                placeholder="Año"
                onChange={e => { setFilterYear(e.target.value); setTablePage(1) }}
                className={`${selectClass} w-[80px]`}
              />
              {hasFilter && (
                <button
                  onClick={() => { setFilterMonth(''); setFilterYear(''); setTablePage(1) }}
                  className="text-[11px] text-text-faint hover:text-text-muted transition-colors"
                >
                  Ver todo
                </button>
              )}
            </div>
          </div>

          <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b border-surface-3">
                  {['Día', 'Efectivo', 'SPEI', 'Tarjeta', 'Total', 'Transacciones'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingTable ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <Loader2 size={16} className="animate-spin text-text-faint mx-auto" />
                    </td>
                  </tr>
                ) : days.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[12px] text-text-faint">
                      Sin movimientos registrados
                    </td>
                  </tr>
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
              {days.length > 0 && (() => {
                const t = { cash: 0, spei: 0, card: 0, txns: 0 }
                for (const [, d] of days) { t.cash += d.cash; t.spei += d.spei; t.card += d.card; t.txns += d.txns }
                return (
                  <tfoot>
                    <tr className="border-t border-surface-3 bg-surface-1">
                      <td className="px-4 py-3 text-[12px] font-medium text-text-muted">Total</td>
                      <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(t.cash)}</td>
                      <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(t.spei)}</td>
                      <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(t.card)}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-text-primary">{formatCurrency(t.cash + t.spei + t.card)}</td>
                      <td className="px-4 py-3 text-[12px] text-text-muted">{t.txns}</td>
                    </tr>
                  </tfoot>
                )
              })()}
            </table>
            </div>
            <Pagination
              page={tablePage}
              pageSize={CASH_PAGE_SIZE}
              total={tableTotal}
              onPageChange={setTablePage}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
