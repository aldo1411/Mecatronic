'use client'
interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}
export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <div className="px-6 py-3.5 border-b border-surface-3 flex items-center justify-between bg-surface-0 sticky top-0 z-10">
      <div>
        <h1 className="text-[15px] font-medium text-text-primary">{title}</h1>
        {subtitle && <p className="text-[12px] text-text-faint">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
