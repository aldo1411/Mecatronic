import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getWorkOrders, getWorkOrder, createWorkOrder,
  updateWorkOrderState, updateWorkOrderMechanic,
  addWorkOrderPart, getWorkshopMechanics, PAGE_SIZE,
  uploadWorkOrderPhoto, updateWorkOrderPhotos, deleteWorkOrderPhoto,
  getHistoryNotes, HISTORY_PAGE_SIZE,
  cancelWorkOrder, getWorkOrderBalance,
  addHistoryNote,
  type SortField, type SortDir
} from '@/services/work-orders'
import type { WorkOrderState } from '@/types/database'

export type { SortField, SortDir }

export function useWorkOrders(params?: {
  state?:     WorkOrderState
  page?:      number
  sortField?: SortField
  sortDir?:   SortDir
}) {
  return useQuery({
    queryKey: ['work-orders', params],
    queryFn:  () => getWorkOrders(params),
  })
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: ['work-order', id],
    queryFn:  () => getWorkOrder(id),
    enabled:  !!id,
  })
}

export function useWorkshopMechanics() {
  return useQuery({
    queryKey: ['workshop-mechanics'],
    queryFn:  getWorkshopMechanics,
  })
}

export function useCreateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createWorkOrder,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['work-orders'] }),
  })
}

export function useUpdateWorkOrderState() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, state }: { id: string; state: WorkOrderState }) =>
      updateWorkOrderState(id, state),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['work-orders'] })
      qc.invalidateQueries({ queryKey: ['work-order', id] })
    },
  })
}

export function useUpdateWorkOrderMechanic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, mechanicId }: { id: string; mechanicId: string }) =>
      updateWorkOrderMechanic(id, mechanicId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['work-order', id] })
    },
  })
}

export function useAddWorkOrderPart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: addWorkOrderPart,
    onSuccess:  (_, { workOrderId }) =>
      qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  })
}

export function useUploadWorkOrderPhoto(workOrderId: string, workshopId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const path    = await uploadWorkOrderPhoto(workshopId, workOrderId, file)
      const current = qc.getQueryData<{ photos?: string[] }>(['work-order', workOrderId])
      const photos  = [...(current?.photos ?? []), path]
      await updateWorkOrderPhotos(workOrderId, photos)
      return photos
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  })
}

export function useDeleteWorkOrderPhoto(workOrderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (path: string) => {
      await deleteWorkOrderPhoto(path)
      const current = qc.getQueryData<{ photos?: string[] }>(['work-order', workOrderId])
      const photos  = (current?.photos ?? []).filter(p => p !== path)
      await updateWorkOrderPhotos(workOrderId, photos)
      return photos
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  })
}

export function useHistoryNotes(vehicleId: string | undefined, page: number) {
  return useQuery({
    queryKey: ['history-notes', vehicleId, page],
    queryFn:  () => getHistoryNotes(vehicleId!, page),
    enabled:  !!vehicleId,
  })
}

export function useCancelWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelWorkOrder(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['work-orders'] })
      qc.invalidateQueries({ queryKey: ['work-order', id] })
    },
  })
}

export function useWorkOrderBalance(workOrderId: string | undefined) {
  return useQuery({
    queryKey: ['work-order-balance', workOrderId],
    queryFn:  () => getWorkOrderBalance(workOrderId!),
    enabled:  !!workOrderId,
  })
}

export function useAddHistoryNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: addHistoryNote,
    onSuccess: (_, { workOrderId }) => {
      qc.invalidateQueries({ queryKey: ['work-order', workOrderId] })
      qc.invalidateQueries({ queryKey: ['history-notes'] })
    },
  })
}

export { PAGE_SIZE, HISTORY_PAGE_SIZE }
