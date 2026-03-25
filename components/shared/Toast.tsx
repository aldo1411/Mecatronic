'use client'
import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastData {
  id: string
  type: ToastType
  title: string
  message?: string
}

// Global toast state — simple pub/sub sin dependencias externas
type Listener = (toasts: ToastData[]) => void
let _toasts: ToastData[] = []
const _listeners: Set<Listener> = new Set()

function notify() {
  _listeners.forEach(l => l([..._toasts]))
}

export const toast = {
  show(type: ToastType, title: string, message?: string) {
    const id = crypto.randomUUID()
    _toasts = [..._toasts, { id, type, title, message }]
    notify()
    setTimeout(() => toast.dismiss(id), 5000)
    return id
  },
  success: (title: string, message?: string) => toast.show('success', title, message),
  error:   (title: string, message?: string) => toast.show('error',   title, message),
  warning: (title: string, message?: string) => toast.show('warning', title, message),
  info:    (title: string, message?: string) => toast.show('info',    title, message),
  dismiss(id: string) {
    _toasts = _toasts.filter(t => t.id !== id)
    notify()
  },
}

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
}

const STYLES = {
  success: 'bg-brand-500/20 border-brand-400/50 text-brand-200',
  error:   'bg-red-950/80  border-red-800/50   text-red-300',
  warning: 'bg-amber-950/80 border-amber-800/50 text-amber-300',
  info:    'bg-blue-950/80  border-blue-800/50  text-blue-300',
}

const ICON_STYLES = {
  success: 'text-brand-300',
  error:   'text-red-400',
  warning: 'text-amber-400',
  info:    'text-blue-400',
}

function ToastItem({ toast: t, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)
  const Icon = ICONS[t.type]

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg',
        'transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        STYLES[t.type]
      )}
    >
      <Icon size={15} className={cn('flex-shrink-0 mt-0.5', ICON_STYLES[t.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium">{t.title}</p>
        {t.message && <p className="text-[11px] opacity-80 mt-0.5">{t.message}</p>}
      </div>
      <button onClick={onDismiss} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <X size={13} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    const listener: Listener = (t) => setToasts(t)
    _listeners.add(listener)
    return () => { _listeners.delete(listener) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-[340px] max-w-[calc(100vw-2rem)]">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => toast.dismiss(t.id)} />
      ))}
    </div>
  )
}
