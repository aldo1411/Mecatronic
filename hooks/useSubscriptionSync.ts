'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWorkshopStore } from '@/stores/workshop.store'

const POLL_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes

export function useSubscriptionSync() {
  const { activeWorkshop } = useWorkshopStore()

  useEffect(() => {
    if (!activeWorkshop) return

    async function check() {
      const supabase = createClient()

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const jwtStatus = session.user.app_metadata?.subscription_status as string | undefined

      const { data: workshop } = await supabase
        .from('workshops')
        .select('subscription_status')
        .eq('id', activeWorkshop!.id)
        .single()

      if (!workshop) return

      const dbStatus = workshop.subscription_status as string

      if (dbStatus !== jwtStatus) {
        await supabase.auth.refreshSession()
      }
    }

    check()
    const interval = setInterval(check, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [activeWorkshop?.id])
}
