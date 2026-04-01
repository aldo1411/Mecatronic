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
    // createBrowserClient (@supabase/ssr) does NOT auto-process the URL hash fragment.
    // We must parse the tokens manually and call setSession() ourselves.
    // Register the listener BEFORE calling setSession so we never miss the SIGNED_IN event.
    const supabase = createClient()
    const hash = typeof window !== 'undefined' ? window.location.hash : ''

    // URLSearchParams handles percent-encoding correctly
    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token') ?? ''
    const type = params.get('type') // 'invite' | 'recovery' | null

    const fromInvite = type === 'invite'
    if (fromInvite) setIsInvite(true)

    // After a successful setSession() we clear the hash and store this flag so that
    // a page refresh (hash is gone) can recover the still-valid session via INITIAL_SESSION
    // instead of incorrectly showing "expirado".
    const alreadyProcessed = sessionStorage.getItem('rp-session-ready') === '1'

    // No token AND not a post-exchange refresh → invalid/direct navigation
    if (!accessToken && !alreadyProcessed) {
      setTokenExpired(true)
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Fired by our explicit setSession() call below
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
        setReady(true)
      }
      // Trusted on a post-exchange refresh only (sessionStorage flag set).
      // Without the flag this could be a pre-existing session → session-hijack risk.
      if (event === 'INITIAL_SESSION' && session && alreadyProcessed) {
        setReady(true)
      }
    })

    if (accessToken) {
      // Exchange hash tokens for a live session.
      // On success: clear hash so refresh won't re-exchange the consumed token;
      //             set sessionStorage flag so refresh recovers via INITIAL_SESSION.
      // On error:   show expired immediately.
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setTokenExpired(true)
          } else {
            sessionStorage.setItem('rp-session-ready', '1')
            window.history.replaceState(null, '', window.location.pathname)
          }
        })
    }

    // Safety-net in case neither the event nor the setSession error fires within 8s
    const timeout = setTimeout(() => setTokenExpired(true), 8000)

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
    // Flow complete — clear the sessionStorage flag so the page can't be reused
    sessionStorage.removeItem('rp-session-ready')
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
