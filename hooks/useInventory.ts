import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getParts, getPartDetail, updatePart, deactivatePart,
  getLowStockAlerts,
  createInventoryEntry, getInventoryEntries, ENTRIES_PAGE_SIZE,
  createInventoryAdjustment, getInventoryAdjustments, ADJUSTMENTS_PAGE_SIZE,
  getInventoryValuation,
  getSuppliers, updateSupplier, deactivateSupplier, SUPPLIERS_PAGE_SIZE,
} from '@/services/inventory'

export { ENTRIES_PAGE_SIZE, ADJUSTMENTS_PAGE_SIZE }

export function useParts(search?: string) {
  return useQuery({
    queryKey: ['parts', search],
    queryFn: () => getParts(search),
  })
}

export function usePartDetail(partId: string) {
  return useQuery({
    queryKey: ['part', partId],
    queryFn: () => getPartDetail(partId),
    enabled: !!partId,
  })
}

export function useUpdatePart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ partId, payload }: { partId: string; payload: Parameters<typeof updatePart>[1] }) =>
      updatePart(partId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parts'] }),
  })
}

export function useDeactivatePart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (partId: string) => deactivatePart(partId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parts'] }),
  })
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: getLowStockAlerts,
  })
}

export function useCreateInventoryEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createInventoryEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parts'] })
      qc.invalidateQueries({ queryKey: ['low-stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['inventory-entries'] })
    },
  })
}

export function useInventoryEntries(workshopId: string | undefined, page: number) {
  return useQuery({
    queryKey: ['inventory-entries', workshopId, page],
    queryFn: () => getInventoryEntries(workshopId!, page),
    enabled: !!workshopId,
  })
}

export function useCreateInventoryAdjustment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createInventoryAdjustment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parts'] })
      qc.invalidateQueries({ queryKey: ['low-stock-alerts'] })
      qc.invalidateQueries({ queryKey: ['inventory-adjustments'] })
    },
  })
}

export function useInventoryAdjustments(workshopId: string | undefined, page: number) {
  return useQuery({
    queryKey: ['inventory-adjustments', workshopId, page],
    queryFn: () => getInventoryAdjustments(workshopId!, page),
    enabled: !!workshopId,
  })
}

export function useInventoryValuation(workshopId: string | undefined) {
  return useQuery({
    queryKey: ['inventory-valuation', workshopId],
    queryFn: () => getInventoryValuation(workshopId!),
    enabled: !!workshopId,
  })
}

export { SUPPLIERS_PAGE_SIZE }

export function useSuppliers(params?: { search?: string; page?: number; sortDir?: 'asc' | 'desc' }) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn:  () => getSuppliers(params),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ supplierId, payload }: { supplierId: string; payload: Parameters<typeof updateSupplier>[1] }) =>
      updateSupplier(supplierId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useDeactivateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (supplierId: string) => deactivateSupplier(supplierId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}
