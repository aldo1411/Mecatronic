import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [workOrders, lowStock, payments] = await Promise.all([
    supabase.from('work_orders').select('state, created_at').eq('is_active', true),
    supabase.from('low_stock_alerts').select('*'),
    supabase.from('payments')
      .select('amount, paid_at')
      .gte('paid_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
  ])

  const todayRevenue = (payments.data ?? []).reduce((sum, p) => sum + p.amount, 0)
  const activeOrders = (workOrders.data ?? []).filter(o =>
    ['received','in_progress','waiting_part','ready'].includes(o.state)
  ).length
  const deliveredToday = (workOrders.data ?? []).filter(o => o.state === 'delivered').length
  const stockAlerts = (lowStock.data ?? []).length

  return (
    <DashboardClient
      metrics={{ todayRevenue, activeOrders, deliveredToday, stockAlerts }}
      recentOrders={[]}
    />
  )
}
