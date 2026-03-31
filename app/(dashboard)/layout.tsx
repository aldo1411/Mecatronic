'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { NavigationLoader } from '@/components/layout/NavigationLoader'
import { createClient } from '@/lib/supabase/client'
import { useWorkshopStore } from '@/stores/workshop.store'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      // Leer del store directamente para evitar closure stale antes de rehydratación de Zustand
      const activeWorkshop = useWorkshopStore.getState().activeWorkshop
      if (!activeWorkshop) {
        router.replace('/select-workshop')
        return
      }

      setChecking(false)
    }

    check()
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-brand-300" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-1">
      <NavigationLoader />
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
