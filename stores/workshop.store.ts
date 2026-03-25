import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workshop, UserRole, SubscriptionStatus } from '@/types/database'

interface WorkshopState {
  activeWorkshop: Workshop | null
  activeRole: UserRole | null
  subscriptionStatus: SubscriptionStatus | null
  userWorkshops: Workshop[]
  setActiveWorkshop: (workshop: Workshop, role: UserRole, status: SubscriptionStatus) => void
  setUserWorkshops: (workshops: Workshop[]) => void
  clearWorkshop: () => void
}

export const useWorkshopStore = create<WorkshopState>()(
  persist(
    (set) => ({
      activeWorkshop: null,
      activeRole: null,
      subscriptionStatus: null,
      userWorkshops: [],
      setActiveWorkshop: (workshop, role, status) =>
        set({ activeWorkshop: workshop, activeRole: role, subscriptionStatus: status }),
      setUserWorkshops: (workshops) => set({ userWorkshops: workshops }),
      clearWorkshop: () =>
        set({ activeWorkshop: null, activeRole: null, subscriptionStatus: null }),
    }),
    { name: 'mecatronic-workshop' }
  )
)
