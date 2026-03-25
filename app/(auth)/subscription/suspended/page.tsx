'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, LogOut } from 'lucide-react'

export default function SuspendedPage() {
  const router = useRouter()
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }
  return (
    <div className="min-h-screen bg-surface-1 flex items-center justify-center p-4">
      <div className="max-w-[380px] w-full text-center animate-fadeIn">
        <div className="w-14 h-14 bg-amber-950 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={24} className="text-amber-400" />
        </div>
        <h1 className="text-[18px] font-medium text-text-primary mb-2">Suscripción suspendida</h1>
        <p className="text-[13px] text-text-muted mb-6">
          El acceso a tu taller ha sido suspendido por falta de pago. Contacta al administrador para reactivar tu cuenta.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 mx-auto text-[12px] text-text-muted hover:text-text-primary transition-colors"
        >
          <LogOut size={13} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
