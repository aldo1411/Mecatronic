'use client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { useQuery } from '@tanstack/react-query'
import { getVehiclesByClient } from '@/services/clients'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { WorkOrderBadge } from '@/components/shared/StatusBadge'
import { Car, Plus, Loader2 } from 'lucide-react'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*, contacts(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => getVehiclesByClient(id),
  })

  const { data: orders } = useQuery({
    queryKey: ['client-orders', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('work_orders')
        .select('*, vehicles(brand, model, year)')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(10)
      return data ?? []
    },
  })

  if (loadingProfile) return <div className="flex items-center justify-center h-64"><Loader2 size={20} className="animate-spin text-text-muted" /></div>
  if (!profile) return <div className="p-6 text-text-muted">Cliente no encontrado</div>

  const phone = profile.contacts?.find((c: { contact_type: string; contact: string }) => c.contact_type === 'phone')
  const email = profile.contacts?.find((c: { contact_type: string; contact: string }) => c.contact_type === 'email')
  const totalSpent = (orders ?? []).reduce((s: number, o: { total_cost: number }) => s + (o.total_cost ?? 0), 0)

  return (
    <div>
      <Topbar
        title={`${profile.name} ${profile.last_name}`}
        subtitle="Ficha del cliente"
        actions={
          <Link
            href={`/service-orders/new?clientId=${id}`}
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 text-brand-100 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
          >
            <Plus size={13} /> Nueva OS
          </Link>
        }
      />

      <div className="p-6 grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* Orders history */}
          <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
              <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Historial de órdenes</p>
              <p className="text-[11px] text-text-faint">{orders?.length ?? 0} órdenes</p>
            </div>
            {!orders || orders.length === 0 ? (
              <div className="p-6 text-center text-[12px] text-text-faint">Sin órdenes registradas</div>
            ) : (
              <div>
                {orders.map((order: { id: string; folio: string; state: string; total_cost: number; created_at: string; vehicles?: { brand: string; model: string; year: number } }) => (
                  <Link
                    key={order.id}
                    href={`/service-orders/${order.id}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-surface-3/40 last:border-0 hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <p className="text-[12px] font-medium text-text-primary">{order.folio}</p>
                      <p className="text-[10px] text-text-faint">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-text-secondary truncate">
                        {order.vehicles ? `${order.vehicles.brand} ${order.vehicles.model} ${order.vehicles.year}` : '—'}
                      </p>
                    </div>
                    <WorkOrderBadge state={order.state as never} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Vehicles */}
          <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
              <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Vehículos</p>
              <button className="text-[11px] text-brand-300 hover:text-brand-200 transition-colors flex items-center gap-1">
                <Plus size={11} /> Agregar
              </button>
            </div>
            {!vehicles || vehicles.length === 0 ? (
              <div className="p-5 text-center text-[12px] text-text-faint">Sin vehículos registrados</div>
            ) : (
              <div className="divide-y divide-surface-3/50">
                {vehicles.map(v => (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 bg-surface-2 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Car size={14} className="text-text-muted" />
                    </div>
                    <p className="text-[13px] text-text-primary">{v.brand} {v.model} {v.year}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Profile card */}
          <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
            <div className="p-5 text-center border-b border-surface-3">
              <div className="w-14 h-14 rounded-full bg-blue-950 flex items-center justify-center text-[18px] font-medium text-blue-300 mx-auto mb-3">
                {profile.name[0]}{profile.last_name[0]}
              </div>
              <p className="text-[15px] font-medium text-text-primary">{profile.name} {profile.last_name} {profile.second_last_name ?? ''}</p>
              {profile.rfc && <p className="text-[11px] text-text-faint mt-1">RFC: {profile.rfc}</p>}
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Teléfono', value: phone?.contact ?? '—' },
                { label: 'Correo', value: email?.contact ?? '—' },
                { label: 'Cliente desde', value: formatDate(profile.created_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-text-faint uppercase tracking-wider">{label}</p>
                  <p className="text-[12px] text-text-secondary mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-surface-0 border border-surface-3 rounded-xl p-4 space-y-3">
            {[
              { label: 'Total de órdenes', value: orders?.length ?? 0 },
              { label: 'Vehículos', value: vehicles?.length ?? 0 },
              { label: 'Gasto total', value: `$${totalSpent.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <p className="text-[12px] text-text-faint">{label}</p>
                <p className="text-[13px] font-medium text-text-primary">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
