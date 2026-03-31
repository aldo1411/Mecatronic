'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkshopStore } from '@/stores/workshop.store'

const BILLING_ROLES = ['owner', 'admin', 'receptionist', 'superadmin']

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useWorkshopStore()
  const router = useRouter()

  useEffect(() => {
    if (activeRole && !BILLING_ROLES.includes(activeRole)) {
      router.replace('/')
    }
  }, [activeRole, router])

  if (!activeRole || !BILLING_ROLES.includes(activeRole)) return null

  return <>{children}</>
}
