'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Package, Receipt, Users, Settings, ChevronDown, Wrench, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkshopStore } from '@/stores/workshop.store'
import { useLowStockAlerts } from '@/hooks/useInventory'
import { useSubscriptionSync } from '@/hooks/useSubscriptionSync'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const BILLING_ROLES = ['owner', 'admin', 'receptionist', 'superadmin']

const NAV: { label: string; href: string | null; icon: typeof LayoutDashboard | null; section: string | null; roles?: string[] }[] = [
  { label: 'Dashboard',             href: '/',                    icon: LayoutDashboard, section: null },
  { label: 'Órdenes de servicio',   href: '/service-orders',      icon: ClipboardList,   section: null },
  { label: 'Inventario',            href: null,                   icon: null,            section: 'Inventario', roles: BILLING_ROLES },
  { label: 'Refacciones',           href: '/inventory',                icon: Package, section: null,       roles: BILLING_ROLES },
  { label: 'Entradas',              href: '/inventory/entries',        icon: null,    section: null,       roles: BILLING_ROLES },
  { label: 'Ajustes',               href: '/inventory/adjustments',    icon: null,    section: null,       roles: BILLING_ROLES },
  { label: 'Proveedores',           href: '/inventory/suppliers',      icon: null,    section: null,       roles: BILLING_ROLES },
  { label: 'Valuación',             href: '/inventory/valuation',      icon: null,    section: null,       roles: BILLING_ROLES },
  { label: 'Cobro',                 href: null,                   icon: null,            section: 'Cobro',    roles: BILLING_ROLES },
  { label: 'Cobros',                href: '/billing',             icon: Receipt,         section: null,       roles: BILLING_ROLES },
  { label: 'Caja',                  href: '/billing/cash',        icon: null,            section: null,       roles: BILLING_ROLES },
  { label: 'Catálogo servicios',    href: '/billing/catalog',     icon: null,            section: null,       roles: BILLING_ROLES },
  { label: 'Clientes',              href: null,                   icon: null,            section: 'Clientes', roles: BILLING_ROLES },
  { label: 'Clientes',              href: '/clients',             icon: Users,           section: null,       roles: BILLING_ROLES },
  { label: 'Configuración',         href: null,                   icon: null,            section: 'Sistema' },
  { label: 'Configuración',         href: '/settings',            icon: Settings,        section: null },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { activeWorkshop, activeRole, clearWorkshop } = useWorkshopStore()
  const { data: lowStock } = useLowStockAlerts()
  useSubscriptionSync()
  const lowStockCount = lowStock?.length ?? 0

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearWorkshop()
    router.push('/login')
  }

  return (
    <aside className="w-[220px] min-w-[220px] bg-surface-0 border-r border-surface-3 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-[18px] border-b border-surface-3">
        <div className="flex items-center gap-2">
          <div className="w-[26px] h-[26px] bg-brand-400 rounded-md flex items-center justify-center">
            <Wrench size={13} className="text-brand-100" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-text-primary">AutoGestión</p>
            <p className="text-[10px] text-text-muted">Panel de taller</p>
          </div>
        </div>
      </div>

      {/* Workshop switcher */}
      <Link href="/select-workshop" className="mx-[10px] my-[10px] px-[10px] py-2 bg-surface-2 border border-surface-3 rounded-lg cursor-pointer flex items-center justify-between hover:border-brand-400/50 transition-colors">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-text-primary truncate">
            {activeWorkshop?.name ?? 'Sin taller'}
          </p>
          <p className="text-[10px] text-text-muted capitalize">{activeRole ?? '—'}</p>
        </div>
        <ChevronDown size={12} className="text-text-muted flex-shrink-0 ml-2" />
      </Link>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV.filter(item => !item.roles || (activeRole && item.roles.includes(activeRole))).map((item, idx) => {
          if (item.section !== null && item.href === null) {
            return (
              <div key={`section-${idx}`} className="px-4 pt-4 pb-1">
                <p className="text-[10px] text-text-faint uppercase tracking-widest">{item.section}</p>
              </div>
            )
          }
          if (!item.href) return null

          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
              && !(item.href === '/inventory' && pathname.startsWith('/inventory/'))
              && !(item.href === '/billing'   && pathname.startsWith('/billing/'))
          const isSubItem = !item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 py-[7px] mx-1.5 px-3 rounded-md text-[12px] transition-all duration-150',
                isSubItem && 'pl-8',
                isActive
                  ? 'bg-brand-500/30 text-brand-200'
                  : 'text-text-muted hover:bg-surface-2 hover:text-text-primary'
              )}
            >
              {item.icon && <item.icon size={14} className="flex-shrink-0" />}
              <span className="truncate">{item.label}</span>
              {item.href === '/inventory' && lowStockCount > 0 && (
                <span className="ml-auto bg-amber-900 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                  {lowStockCount}
                </span>
              )}
              {item.href === '/service-orders' && (
                <span className="ml-auto text-[10px] text-text-faint flex-shrink-0">OS</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-2.5 border-t border-surface-3">
        <div className="flex items-center gap-2 p-1.5 rounded-md">
          <div className="w-7 h-7 rounded-full bg-blue-900 flex items-center justify-center text-[11px] font-medium text-blue-300 flex-shrink-0">
            TL
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-text-primary truncate">Taldo Lozano</p>
            <p className="text-[10px] text-text-faint capitalize truncate">{activeRole}</p>
          </div>
          <button onClick={handleLogout} className="text-text-faint hover:text-text-muted transition-colors flex-shrink-0">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
