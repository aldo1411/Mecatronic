'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { TableLoader, TableBackdrop } from '@/components/shared/Loader'
import { Topbar } from '@/components/layout/Topbar'
import { InvoiceBadge } from '@/components/shared/StatusBadge'
import { Pagination } from '@/components/shared/Pagination'
import { useInvoices, useCreateInvoiceFromWorkOrder, INVOICES_PAGE_SIZE } from '@/hooks/useBilling'
import { useWorkshopStore } from '@/stores/workshop.store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/components/shared/Toast'
import { Loader2, Search } from 'lucide-react'

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
  const [search, setSearch]       = useState('')

  const { data, isLoading, isFetching } = useInvoices({
    page,
    status:     status || undefined,
    dateFrom:   dateFrom || undefined,
    dateTo:     dateTo || undefined,
    workshopId: activeWorkshop?.id,
    search:     search || undefined,
  })

  const invoices = data?.data ?? []
  const total    = data?.total ?? 0

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
    setStatus(''); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1)
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
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por folio o N° de OS..."
              className="bg-surface-0 border border-surface-3 rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors w-[260px]"
            />
          </div>
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
                {['Folio', 'Orden de Servicio', 'Cliente', 'Total', 'Estado', 'Fecha', ''].map(h => (
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
                const client = inv.profiles as { id: string; name: string; last_name: string } | undefined
                const wo     = inv.work_orders as { id: string; folio: string } | undefined
                return (
                  <tr key={inv.id} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{inv.folio}</td>
                    <td className="px-4 py-3 text-[12px]">
                      {wo
                        ? <Link href={`/service-orders/detail?id=${wo.id}`} className="text-text-secondary hover:text-brand-200 transition-colors">{wo.folio}</Link>
                        : <span className="text-text-faint">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      {client
                        ? <Link href={`/clients/detail?id=${client.id}`} className="text-text-secondary hover:text-brand-200 transition-colors">{client.name} {client.last_name}</Link>
                        : <span className="text-text-faint">—</span>}
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

          <Pagination
            page={page}
            pageSize={INVOICES_PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
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
