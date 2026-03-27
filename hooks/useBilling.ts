import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInvoices, getInvoice, getInvoiceBalance,
  createInvoiceFromWorkOrder,
  addInvoiceItem, updateInvoiceItem, deleteInvoiceItem,
  cancelInvoice,
  addPayment, generateReceiptPdf,
  getServiceCatalog, getDailyCashSummary,
} from '@/services/billing'
import { useWorkshopStore } from '@/stores/workshop.store'

export { INVOICES_PAGE_SIZE } from '@/services/billing'

export function useInvoices(params?: {
  page?: number
  status?: string
  dateFrom?: string
  dateTo?: string
  workshopId?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn:  () => getInvoices(params),
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn:  () => getInvoice(id),
    enabled:  !!id,
  })
}

export function useInvoiceBalance(invoiceId: string) {
  return useQuery({
    queryKey: ['invoice-balance', invoiceId],
    queryFn:  () => getInvoiceBalance(invoiceId),
    enabled:  !!invoiceId,
  })
}

export function useCreateInvoiceFromWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createInvoiceFromWorkOrder,
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: ['invoice', invoice.id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['work-order'] })
    },
  })
}

export function useAddInvoiceItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: addInvoiceItem,
    onSuccess: (_, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      qc.invalidateQueries({ queryKey: ['invoice-balance', invoiceId] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['parts'] })
    },
  })
}

export function useUpdateInvoiceItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateInvoiceItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice'] })
      qc.invalidateQueries({ queryKey: ['invoice-balance'] })
    },
  })
}

export function useDeleteInvoiceItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteInvoiceItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice'] })
      qc.invalidateQueries({ queryKey: ['invoice-balance'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['parts'] })
    },
  })
}

export function useCancelInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cancelInvoice,
    onSuccess: (_, invoiceId) => {
      qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['work-orders'] })
      qc.invalidateQueries({ queryKey: ['work-order'] })
      qc.invalidateQueries({ queryKey: ['parts'] })
    },
  })
}

export function useAddPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: addPayment,
    onSuccess: (_, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      qc.invalidateQueries({ queryKey: ['invoice-balance', invoiceId] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      // El RPC puede haber entregado la OS automáticamente
      qc.invalidateQueries({ queryKey: ['work-orders'] })
      qc.invalidateQueries({ queryKey: ['work-order-balance'] })
    },
  })
}

export function useGenerateReceiptPdf() {
  return useMutation({
    mutationFn: ({ invoiceId, paymentId }: { invoiceId: string; paymentId?: string }) =>
      generateReceiptPdf(invoiceId, paymentId),
  })
}

export function useServiceCatalog() {
  const { activeWorkshop } = useWorkshopStore()
  return useQuery({
    queryKey: ['service-catalog', activeWorkshop?.id],
    queryFn:  () => getServiceCatalog(activeWorkshop!.id),
    enabled:  !!activeWorkshop,
  })
}

export function useDailyCashSummary() {
  const { activeWorkshop } = useWorkshopStore()
  return useQuery({
    queryKey: ['daily-cash-summary', activeWorkshop?.id],
    queryFn:  () => getDailyCashSummary(activeWorkshop!.id),
    enabled:  !!activeWorkshop,
  })
}
