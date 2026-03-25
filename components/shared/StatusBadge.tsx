import { cn } from '@/lib/utils'
import type { WorkOrderState, InvoiceStatus } from '@/types/database'

const WO_STATE_MAP: Record<WorkOrderState, { label: string; className: string }> = {
  received:      { label: 'Recibido',          className: 'bg-blue-950 text-blue-300' },
  in_progress:   { label: 'En proceso',        className: 'bg-amber-950 text-amber-300' },
  waiting_part:  { label: 'Esp. refacción',    className: 'bg-teal-950 text-teal-300' },
  ready:         { label: 'Listo',             className: 'bg-brand-500 text-brand-100' },
  delivered:     { label: 'Entregado',         className: 'bg-surface-2 text-text-secondary' },
  cancelled:     { label: 'Cancelado',         className: 'bg-red-950 text-red-400' },
}

const INVOICE_STATUS_MAP: Record<InvoiceStatus, { label: string; className: string }> = {
  draft:     { label: 'Borrador',       className: 'bg-surface-2 text-text-secondary' },
  issued:    { label: 'Emitido',        className: 'bg-purple-950 text-purple-300' },
  partial:   { label: 'Pago parcial',   className: 'bg-blue-950 text-blue-300' },
  paid:      { label: 'Pagado',         className: 'bg-brand-500 text-brand-100' },
  cancelled: { label: 'Cancelado',      className: 'bg-red-950 text-red-400' },
}

export function WorkOrderBadge({ state }: { state: WorkOrderState }) {
  const { label, className } = WO_STATE_MAP[state] ?? WO_STATE_MAP.received
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded text-[10px] font-medium', className)}>
      {label}
    </span>
  )
}

export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = INVOICE_STATUS_MAP[status] ?? INVOICE_STATUS_MAP.draft
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded text-[10px] font-medium', className)}>
      {label}
    </span>
  )
}
