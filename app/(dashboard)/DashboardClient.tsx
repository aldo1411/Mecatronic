'use client'
import { Topbar } from '@/components/layout/Topbar'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useLowStockAlerts } from '@/hooks/useInventory'
import { useDailyCashSummary } from '@/hooks/useBilling'
import { WorkOrderBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { TrendingUp, ClipboardList, Package, CheckCircle, Plus } from 'lucide-react'
import Link from 'next/link'

export function DashboardClient() {
  const { data: result, isLoading } = useWorkOrders()
  const { data: lowStock } = useLowStockAlerts()
  const { data: cashSummary } = useDailyCashSummary()

  const today = new Date().toISOString().slice(0, 10)
  const todayRevenue = (cashSummary ?? [])
    .filter(r => r.day === today)
    .reduce((s, r) => s + r.total, 0)

  const allOrders = result?.data ?? []
  const activeOrderCount = allOrders.filter(o =>
    ['received','in_progress','waiting_part','ready'].includes(o.state)
  ).length
  const deliveredToday = allOrders.filter(o =>
    o.state === 'delivered' && o.created_at?.slice(0, 10) === today
  ).length

  const activeOrders = allOrders.filter(o =>
    ['received','in_progress','waiting_part','ready'].includes(o.state)
  ).slice(0, 5)

  const todayLabel = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div>
      <Topbar
        title="Dashboard"
        subtitle={todayLabel}
        actions={
          <Link
            href="/service-orders/new"
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 text-brand-100 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
          >
            <Plus size={13} />
            Nueva OS
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'OS activas', value: activeOrderCount, icon: ClipboardList, color: 'text-blue-300' },
            { label: 'Ingresos hoy', value: formatCurrency(todayRevenue), icon: TrendingUp, color: 'text-brand-200' },
            { label: 'OS entregadas hoy', value: deliveredToday, icon: CheckCircle, color: 'text-brand-200' },
            { label: 'Inventario crítico', value: (lowStock ?? []).length, icon: Package, color: 'text-amber-300' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-surface-0 border border-surface-3 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-text-faint">{label}</p>
                <Icon size={14} className={color} />
              </div>
              <p className="text-[22px] font-medium text-text-primary">{value}</p>
            </div>
          ))}
        </div>

        {/* Recent work orders */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
              <p className="text-[13px] font-medium text-text-primary">Órdenes activas</p>
              <Link href="/service-orders" className="text-[11px] text-brand-300 hover:text-brand-200 transition-colors">
                Ver todas →
              </Link>
            </div>
            {isLoading ? (
              <div className="p-6 text-center text-[12px] text-text-faint">Cargando...</div>
            ) : activeOrders.length === 0 ? (
              <div className="p-6 text-center text-[12px] text-text-faint">Sin órdenes activas</div>
            ) : (
              <div>
                {activeOrders.map(order => {
                  const client = order.profiles as { name: string; last_name: string } | undefined
                  const vehicle = order.vehicles as { brand: string; model: string; year: number } | undefined
                  return (
                    <Link
                      key={order.id}
                      href={`/service-orders/detail?id=${order.id}`}
                      className="flex items-center gap-3 px-4 py-3 border-b border-surface-3/50 last:border-0 hover:bg-surface-2 transition-colors"
                    >
                      <div className="flex-shrink-0 w-[90px]">
                        <p className="text-[12px] font-medium text-text-primary">{order.folio}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-text-primary truncate">
                          {vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : '—'}
                        </p>
                        <p className="text-[11px] text-text-faint">
                          {client ? `${client.name} ${client.last_name}` : '—'}
                        </p>
                      </div>
                      <WorkOrderBadge state={order.state} />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Alerts */}
          <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-3">
              <p className="text-[13px] font-medium text-text-primary">Alertas de inventario</p>
            </div>
            {!lowStock || lowStock.length === 0 ? (
              <div className="p-5 text-center text-[12px] text-text-faint">Sin alertas</div>
            ) : (
              <div>
                {lowStock.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3 border-b border-surface-3/50 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[12px] text-text-secondary truncate">{item.name}</p>
                      <p className="text-[10px] text-text-faint mt-0.5">
                        {item.quantity_on_hand} / {item.min_stock} mín.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
