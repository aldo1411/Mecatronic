'use client'
import { Menu } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const { toggleSidebar } = useUIStore()

  return (
    <div className="px-4 md:px-6 py-3.5 border-b border-surface-3 flex items-center justify-between bg-surface-0 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-[15px] font-medium text-text-primary">{title}</h1>
          {subtitle && <p className="text-[11px] text-text-faint">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
