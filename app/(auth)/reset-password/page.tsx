'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Wrench, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [isInvite, setIsInvite] = useState(false)
  const [tokenExpired, setTokenExpired] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // createClient() processes the #access_token hash immediately, replacing any
    // existing session with the invite/recovery session BEFORE onAuthStateChange fires.
    // We must NOT use getSession() here — it could return a stale existing session
    // (e.g. a previously logged-in user) and cause updateUser() to run on the wrong account.
    //
    // Instead we rely solely on onAuthStateChange:
    //   INITIAL_SESSION — fires immediately on registration with the post-hash session
    //   PASSWORD_RECOVERY — fires for reset links
    //   SIGNED_IN — fires for invite links if processed after listener registration
    const supabase = createClient()
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const fromInvite = hash.includes('type=invite')
    const fromRecovery = hash.includes('type=recovery')
    // Verify the URL actually carries a token — prevents a pre-existing session from
    // hijacking this page when the link is expired/absent (the token would be missing).
    const hasToken = hash.includes('access_token=')
    if (fromInvite) setIsInvite(true)

    // No token in the URL at all → show expired immediately, no need to wait
    if (!hasToken) {
      setTokenExpired(true)
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
      // Only accept SIGNED_IN / INITIAL_SESSION if the URL had a token — this prevents
      // a pre-existing logged-in session from bypassing an expired link.
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && hasToken && (fromInvite || fromRecovery)) {
        setReady(true)
      }
    })

    // If no valid session event fires within 8s the token is likely expired or invalid
    const timeout = setTimeout(() => {
      setTokenExpired(true)
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Invite: user is already signed in → go pick their workshop
    // Recovery: session is consumed → go log in with new password
    router.replace(isInvite ? '/select-workshop' : '/login')
  }

  return (
    <div className="min-h-screen bg-surface-1 flex items-center justify-center p-4">
      <div className="w-full max-w-[360px] animate-fadeIn">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 bg-brand-400 rounded-xl flex items-center justify-center">
            <Wrench size={17} className="text-brand-100" />
          </div>
          <div>
            <p className="text-[16px] font-medium text-text-primary">AutoGestión MX</p>
            <p className="text-[11px] text-text-muted">Gestión de talleres automotrices</p>
          </div>
        </div>

        <div className="bg-surface-0 border border-surface-3 rounded-xl p-6">
          {!ready ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              {tokenExpired ? (
                <>
                  <p className="text-[15px] font-medium text-text-primary">Enlace inválido o expirado</p>
                  <p className="text-[13px] text-text-muted">Este link ya no es válido. Solicita una nueva invitación o restablece tu contraseña.</p>
                  <button
                    onClick={() => router.replace('/login')}
                    className="mt-2 text-[12px] text-brand-300 hover:text-brand-200 transition-colors"
                  >
                    Volver al inicio de sesión
                  </button>
                </>
              ) : (
                <>
                  <Loader2 size={20} className="animate-spin text-brand-300" />
                  <p className="text-[13px] text-text-muted">Verificando enlace...</p>
                </>
              )}
            </div>
          ) : (
            <>
              <h1 className="text-[18px] font-medium text-text-primary mb-1">Nueva contraseña</h1>
              <p className="text-[13px] text-text-muted mb-6">Elige una contraseña segura para tu cuenta.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] text-text-muted uppercase tracking-wider mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Mínimo 8 caracteres"
                      className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 pr-10 text-[13px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-text-muted uppercase tracking-wider mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Repite la contraseña"
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                  />
                </div>

                {error && (
                  <div className="bg-red-950 border border-red-900 rounded-lg px-3 py-2.5 text-[12px] text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="w-full bg-brand-400 hover:bg-brand-300 disabled:opacity-50 disabled:cursor-not-allowed text-brand-100 rounded-lg py-2.5 text-[13px] font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-text-faint mt-4">
          AutoGestión MX · v1.0 MVP
        </p>
      </div>
    </div>
  )
}
