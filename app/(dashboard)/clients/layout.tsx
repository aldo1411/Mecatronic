'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkshopStore } from '@/stores/workshop.store'

const ALLOWED_ROLES = ['owner', 'admin', 'receptionist', 'superadmin']

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useWorkshopStore()
  const router = useRouter()

  useEffect(() => {
    if (activeRole && !ALLOWED_ROLES.includes(activeRole)) {
      router.replace('/')
    }
  }, [activeRole, router])

  if (!activeRole || !ALLOWED_ROLES.includes(activeRole)) return null

  return <>{children}</>
}
