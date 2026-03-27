'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { WorkOrderBadge } from '@/components/shared/StatusBadge'
import { Pagination } from '@/components/shared/Pagination'
import { TableLoader, TableBackdrop } from '@/components/shared/Loader'
import { useWorkOrders, PAGE_SIZE, type SortField, type SortDir } from '@/hooks/useWorkOrders'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { WorkOrderState } from '@/types/database'
import { Plus, Search, ArrowUp, ArrowDown, ArrowUpDown, UserCheck } from 'lucide-react'

const STATES: { value: WorkOrderState | 'all'; label: string }[] = [
  { value: 'all',          label: 'Todas' },
  { value: 'received',     label: 'Recibido' },
  { value: 'in_progress',  label: 'En proceso' },
  { value: 'waiting_part', label: 'Esp. refacción' },
  { value: 'ready',        label: 'Listo' },
  { value: 'delivered',    label: 'Entregado' },
  { value: 'cancelled',    label: 'Cancelado' },
]

interface SortState {
  field: SortField
  dir: SortDir
}

function SortIcon({ field, current }: { field: SortField; current: SortState }) {
  if (current.field !== field) return <ArrowUpDown size={12} className="text-text-faint opacity-40 ml-1 inline" />
  return current.dir === 'asc'
    ? <ArrowUp   size={12} className="text-brand-300 ml-1 inline" />
    : <ArrowDown size={12} className="text-brand-300 ml-1 inline" />
}

export default function ServiceOrdersPage() {
  const [activeState, setActiveState] = useState<WorkOrderState | 'all'>('all')
  const [search, setSearch]           = useState('')
  const [page, setPage]               = useState(1)
  const [sort, setSort]               = useState<SortState>({ field: 'created_at', dir: 'desc' })
  const [assignedToMe, setAssignedToMe] = useState(false)

  const { data: result, isLoading, isFetching } = useWorkOrders({
    state:        activeState !== 'all' ? activeState : undefined,
    page,
    sortField:    sort.field,
    sortDir:      sort.dir,
    assignedToMe,
  })

  const orders = result?.data ?? []
  const total  = result?.total ?? 0

  const filtered = orders.filter(o => {
    if (!search) return true
    const s = search.toLowerCase()
    const client  = o.profiles as { name: string; last_name: string } | undefined
    const vehicle = o.vehicles  as { brand: string; model: string }   | undefined
    return (
      o.folio.toLowerCase().includes(s) ||
      client?.name?.toLowerCase().includes(s) ||
      client?.last_name?.toLowerCase().includes(s) ||
      vehicle?.brand?.toLowerCase().includes(s) ||
      vehicle?.model?.toLowerCase().includes(s)
    )
  })

  function handleStateChange(state: WorkOrderState | 'all') {
    setActiveState(state)
    setPage(1)
  }

  function handleAssignedToMe() {
    setAssignedToMe(p => !p)
    setPage(1)
  }

  function handleSort(field: SortField) {
    setSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }))
    setPage(1)
  }

  const sortableHeader = (label: string, field: SortField) => (
    <th
      onClick={() => handleSort(field)}
      className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium cursor-pointer hover:text-text-muted select-none transition-colors"
    >
      {label}
      <SortIcon field={field} current={sort} />
    </th>
  )

  return (
    <div>
      <Topbar
        title="Órdenes de servicio"
        subtitle={total > 0 ? `${total} órdenes en total` : undefined}
        actions={
          <Link
            href="/service-orders/new"
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 text-brand-100 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
          >
            <Plus size={13} /> Nueva OS
          </Link>
        }
      />

      <div className="p-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por folio, cliente o vehículo..."
              className="bg-surface-0 border border-surface-3 rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors w-[280px]"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATES.map(s => (
              <button
                key={s.value}
                onClick={() => handleStateChange(s.value)}
                className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                  activeState === s.value
                    ? 'bg-brand-500/30 text-brand-200 border-brand-400'
                    : 'bg-transparent text-text-muted border-surface-3 hover:border-surface-2'
                }`}
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={handleAssignedToMe}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                assignedToMe
                  ? 'bg-brand-500/30 text-brand-200 border-brand-400'
                  : 'bg-transparent text-text-muted border-surface-3 hover:border-surface-2'
              }`}
            >
              <UserCheck size={11} />
              Asignadas a mí
            </button>
          </div>

          {/* Sort indicator */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-text-faint">Ordenar por:</span>
            <button
              onClick={() => handleSort('created_at')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors ${
                sort.field === 'created_at'
                  ? 'bg-brand-500/20 text-brand-200 border-brand-400/50'
                  : 'text-text-muted border-surface-3 hover:border-surface-2'
              }`}
            >
              Fecha
              {sort.field === 'created_at'
                ? sort.dir === 'desc'
                  ? <ArrowDown size={11} />
                  : <ArrowUp   size={11} />
                : <ArrowUpDown size={11} className="opacity-40" />
              }
            </button>
            <button
              onClick={() => handleSort('folio')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors ${
                sort.field === 'folio'
                  ? 'bg-brand-500/20 text-brand-200 border-brand-400/50'
                  : 'text-text-muted border-surface-3 hover:border-surface-2'
              }`}
            >
              Folio
              {sort.field === 'folio'
                ? sort.dir === 'desc'
                  ? <ArrowDown size={11} />
                  : <ArrowUp   size={11} />
                : <ArrowUpDown size={11} className="opacity-40" />
              }
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="relative bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          <TableBackdrop visible={isFetching && !isLoading} />
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-surface-3">
                {sortableHeader('Folio', 'folio')}
                <th className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">Vehículo</th>
                <th className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">Cliente</th>
                <th className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">Mecánico</th>
                <th className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">Estado</th>
                <th className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">Total</th>
                {sortableHeader('Fecha', 'created_at')}
                <th className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoader cols={8} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[12px] text-text-faint">
                    {search ? 'Sin resultados para tu búsqueda' : 'Sin órdenes registradas'}
                  </td>
                </tr>
              ) : filtered.map(order => {
                const client   = order.profiles  as { id: string; name: string; last_name: string } | undefined
                const vehicle  = order.vehicles   as { brand: string; model: string; year: number } | undefined
                const mechanic = order.mechanics  as { name: string; last_name: string } | undefined
                return (
                  <tr key={order.id} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 text-[12px] font-medium text-text-primary font-mono">{order.folio}</td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] text-text-primary">
                        {vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      {client
                        ? <Link href={`/clients/detail?id=${client.id}`} className="text-text-secondary hover:text-brand-200 transition-colors">{client.name} {client.last_name}</Link>
                        : <span className="text-text-faint">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text-muted">
                      {mechanic ? `${mechanic.name} ${mechanic.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3"><WorkOrderBadge state={order.state} /></td>
                    <td className="px-4 py-3 text-[12px] font-medium text-text-primary">
                      {(() => {
                        const inv = ((order.invoices ?? []) as { status: string; total: number }[])
                          .find(i => i.status !== 'cancelled')
                        return inv && inv.total > 0 ? formatCurrency(inv.total) : '—'
                      })()}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-text-faint">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/service-orders/detail?id=${order.id}`} className="text-[11px] text-brand-300 hover:text-brand-200 transition-colors">
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
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  )
}
