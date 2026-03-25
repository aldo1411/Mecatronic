import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TableBackdrop({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div className="absolute inset-0 bg-surface-1/60 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
      <Loader2 size={20} className="animate-spin text-brand-300" />
    </div>
  )
}

interface LoaderProps {
  text?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { icon: 14, text: 'text-[11px]' },
  md: { icon: 18, text: 'text-[12px]' },
  lg: { icon: 24, text: 'text-[13px]' },
}

export function Loader({ text, className, size = 'md' }: LoaderProps) {
  const s = SIZES[size]
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16', className)}>
      <Loader2 size={s.icon} className="animate-spin text-brand-300" />
      {text && <p className={cn(s.text, 'text-text-faint')}>{text}</p>}
    </div>
  )
}

export function TableLoader({ cols }: { cols: number }) {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i}>
          {[...Array(cols)].map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-3 bg-surface-3 rounded animate-pulse"
                style={{ width: `${60 + Math.random() * 30}%`, animationDelay: `${i * 80}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function CardLoader() {
  return (
    <div className="space-y-3 p-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-4 bg-surface-3 rounded animate-pulse"
          style={{ width: `${50 + i * 10}%`, animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  )
}
