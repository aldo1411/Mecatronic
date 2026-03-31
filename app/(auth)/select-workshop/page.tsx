'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserWorkshops, switchWorkshop } from '@/services/workshops'
import { useWorkshopStore } from '@/stores/workshop.store'
import type { UserWorkshop } from '@/types/database'
import { Wrench, ChevronRight, Loader2, LogOut } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  owner:        'Dueño',
  admin:        'Administrador',
  mechanic:     'Mecánico',
  receptionist: 'Recepcionista',
  superadmin:   'Superadmin',
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  trialing:  { label: 'Prueba gratuita', className: 'bg-blue-950 text-blue-300' },
  active:    { label: 'Activo',          className: 'bg-brand-500 text-brand-100' },
  past_due:  { label: 'Pago pendiente',  className: 'bg-amber-950 text-amber-300' },
  suspended: { label: 'Suspendido',      className: 'bg-red-950 text-red-400' },
  cancelled: { label: 'Cancelado',       className: 'bg-surface-2 text-text-muted' },
}

function SelectWorkshopContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSwitching = searchParams.get('switch') === 'true'
  const { setActiveWorkshop } = useWorkshopStore()
  const [memberships, setMemberships] = useState<UserWorkshop[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const supabase = createClient()

      const { data: { session } } = await supabase.auth.getSession()
      const meta = session?.user?.app_metadata as {
        active_workshop_id?: string
        active_role?: string
        subscription_status?: string
      } | undefined

      // Si ya tiene workshop activo en el JWT y no viene a cambiar, ir directo al dashboard
      if (!isSwitching && meta?.active_workshop_id && meta?.subscription_status !== 'suspended') {
        const wsList = await getUserWorkshops()
        const activeMembership = wsList.find(m => m.workshop_id === meta.active_workshop_id)
        if (activeMembership?.workshops) {
          setActiveWorkshop(
            activeMembership.workshops,
            (meta.active_role as UserWorkshop['roles'] extends { name: infer R } ? R : never) ?? 'owner',
            (meta.subscription_status as 'active') ?? 'active'
          )
          router.replace('/')
          return
        }
      }

      // Si no, mostrar la lista
      const wsList = await getUserWorkshops()
      setMemberships(wsList)
      setLoading(false)
    }
    init()
  }, [router, setActiveWorkshop, isSwitching])

  async function handleSelect(membership: UserWorkshop) {
    if (!membership.workshops) return
    setSwitching(membership.workshop_id)
    setError(null)
    try {
      const result = await switchWorkshop(membership.workshop_id)
      setActiveWorkshop(
        membership.workshops,
        result.role,
        result.subscriptionStatus
      )
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cambiar de taller')
      setSwitching(null)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-text-muted" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-1 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] animate-fadeIn">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 bg-brand-400 rounded-xl flex items-center justify-center">
            <Wrench size={17} className="text-brand-100" />
          </div>
          <div>
            <p className="text-[16px] font-medium text-text-primary">AutoGestión MX</p>
            <p className="text-[11px] text-text-muted">Selecciona tu taller</p>
          </div>
        </div>

        <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-3">
            <h1 className="text-[15px] font-medium text-text-primary">Tus talleres</h1>
            <p className="text-[12px] text-text-muted mt-0.5">Selecciona el taller al que quieres acceder</p>
          </div>

          {memberships.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-text-muted">No tienes acceso a ningún taller.</p>
              <p className="text-[12px] text-text-faint mt-1">Contacta a tu administrador.</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-3">
              {memberships.map((m) => {
                const ws = m.workshops!
                const statusInfo = STATUS_LABELS[ws.subscription_status] ?? STATUS_LABELS.active
                const isSuspended = ws.subscription_status === 'suspended' || ws.subscription_status === 'cancelled'
                const isLoading = switching === m.workshop_id
                return (
                  <button
                    key={m.id}
                    onClick={() => !isSuspended && handleSelect(m)}
                    disabled={isSuspended || !!switching}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                  >
                    <div className="w-9 h-9 bg-brand-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Wrench size={14} className="text-brand-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-primary truncate">{ws.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-text-faint">{ROLE_LABELS[m.roles?.name ?? ''] ?? m.roles?.name}</span>
                        <span className="text-text-faint">·</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                    {isLoading
                      ? <Loader2 size={14} className="animate-spin text-text-muted flex-shrink-0" />
                      : <ChevronRight size={14} className="text-text-faint flex-shrink-0" />
                    }
                  </button>
                )
              })}
            </div>
          )}

          {error && (
            <div className="mx-4 mb-4 bg-red-950 border border-red-900 rounded-lg px-3 py-2.5 text-[12px] text-red-400">
              {error}
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 text-[12px] text-text-faint hover:text-text-muted transition-colors"
        >
          <LogOut size={13} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default function SelectWorkshopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-text-muted" />
      </div>
    }>
      <SelectWorkshopContent />
    </Suspense>
  )
}
