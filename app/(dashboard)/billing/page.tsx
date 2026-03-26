'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { TableLoader, TableBackdrop } from '@/components/shared/Loader'
import { Topbar } from '@/components/layout/Topbar'
import { InvoiceBadge } from '@/components/shared/StatusBadge'
import { useInvoices, useCreateInvoiceFromWorkOrder, INVOICES_PAGE_SIZE } from '@/hooks/useBilling'
import { useWorkshopStore } from '@/stores/workshop.store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/components/shared/Toast'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

const STATUS_FILTERS = [
  { value: '',          label: 'Todos' },
  { value: 'issued',    label: 'Emitido' },
  { value: 'partial',   label: 'Parcial' },
  { value: 'paid',      label: 'Pagado' },
  { value: 'cancelled', label: 'Cancelado' },
]

function BillingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workOrderId  = searchParams.get('workOrderId')
  const { activeWorkshop } = useWorkshopStore()

  const [page, setPage]           = useState(1)
  const [status, setStatus]       = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')

  const { data, isLoading, isFetching } = useInvoices({
    page,
    status:     status || undefined,
    dateFrom:   dateFrom || undefined,
    dateTo:     dateTo || undefined,
    workshopId: activeWorkshop?.id,
  })

  const invoices   = data?.data ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.ceil(total / INVOICES_PAGE_SIZE)

  const createInvoice = useCreateInvoiceFromWorkOrder()
  const firedRef = useRef(false)

  // Auto-create invoice when coming from a work order
  useEffect(() => {
    if (!workOrderId || !activeWorkshop || firedRef.current) return
    firedRef.current = true
    createInvoice.mutateAsync({ workOrderId, workshopId: activeWorkshop.id })
      .then(invoice => router.replace(`/billing/detail?id=${invoice.id}`))
      .catch(() => {
        firedRef.current = false
        toast.error('Error al crear cobro')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId, activeWorkshop?.id])

  if (workOrderId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 size={20} className="animate-spin text-text-muted" />
        <p className="text-[12px] text-text-faint">Creando cobro...</p>
      </div>
    )
  }

  function resetFilters() {
    setStatus(''); setDateFrom(''); setDateTo(''); setPage(1)
  }

  return (
    <div>
      <Topbar
        title="Cobros"
        subtitle={`${total} cobros registrados`}
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => { setStatus(f.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-[12px] transition-colors ${
                  status === f.value
                    ? 'bg-brand-500/30 text-brand-200 border border-brand-400/40'
                    : 'bg-surface-0 border border-surface-3 text-text-muted hover:text-text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="bg-surface-0 border border-surface-3 rounded-lg px-2 py-1.5 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
            />
            <span className="text-[11px] text-text-faint">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="bg-surface-0 border border-surface-3 rounded-lg px-2 py-1.5 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
            />
          </div>
          {(status || dateFrom || dateTo) && (
            <button onClick={resetFilters} className="text-[11px] text-text-faint hover:text-text-muted transition-colors">
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="relative bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          <TableBackdrop visible={isFetching && !isLoading} />
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-surface-3">
                {['Folio', 'OT', 'Cliente', 'Total', 'Estado', 'Fecha', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoader cols={7} />
              ) : invoices.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[12px] text-text-faint">Sin cobros registrados</td></tr>
              ) : invoices.map(inv => {
                const client = inv.profiles as { name: string; last_name: string } | undefined
                const wo     = inv.work_orders as { folio: string } | undefined
                return (
                  <tr key={inv.id} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{inv.folio}</td>
                    <td className="px-4 py-3 text-[12px] text-text-secondary">{wo?.folio ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-text-secondary">
                      {client ? `${client.name} ${client.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3"><InvoiceBadge status={inv.status} /></td>
                    <td className="px-4 py-3 text-[11px] text-text-faint">{formatDate(inv.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/billing/detail?id=${inv.id}`} className="text-[11px] text-brand-300 hover:text-brand-200 transition-colors">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-3">
              <p className="text-[11px] text-text-faint">{total} cobros · página {page} de {totalPages}</p>
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
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-text-muted" />
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  )
}
