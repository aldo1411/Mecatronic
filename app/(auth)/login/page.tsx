'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Wrench, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.push('/select-workshop')
    router.refresh()
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    setResetError(null)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo })
    if (error) {
      setResetError('No se pudo enviar el correo. Verifica la dirección.')
      setResetLoading(false)
      return
    }
    setResetSent(true)
    setResetLoading(false)
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

        {showReset ? (
          /* ── Reset password card ── */
          <div className="bg-surface-0 border border-surface-3 rounded-xl p-6">
            {resetSent ? (
              <div className="text-center space-y-3">
                <p className="text-[15px] font-medium text-text-primary">Revisa tu correo</p>
                <p className="text-[13px] text-text-muted">
                  Enviamos un link a <span className="text-text-primary">{resetEmail}</span> para restablecer tu contraseña.
                </p>
                <button
                  onClick={() => { setShowReset(false); setResetSent(false); setResetEmail('') }}
                  className="mt-2 text-[12px] text-brand-300 hover:text-brand-200 transition-colors flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft size={12} /> Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => { setShowReset(false); setResetError(null) }}
                  className="flex items-center gap-1 text-[12px] text-text-faint hover:text-text-muted transition-colors mb-4"
                >
                  <ArrowLeft size={12} /> Volver
                </button>
                <h2 className="text-[18px] font-medium text-text-primary mb-1">Restablecer contraseña</h2>
                <p className="text-[13px] text-text-muted mb-6">Te enviaremos un link para crear una nueva contraseña.</p>
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-[11px] text-text-muted uppercase tracking-wider mb-1.5">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      required
                      placeholder="correo@ejemplo.com"
                      className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                    />
                  </div>
                  {resetError && (
                    <div className="bg-red-950 border border-red-900 rounded-lg px-3 py-2.5 text-[12px] text-red-400">
                      {resetError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={resetLoading || !resetEmail}
                    className="w-full bg-brand-400 hover:bg-brand-300 disabled:opacity-50 disabled:cursor-not-allowed text-brand-100 rounded-lg py-2.5 text-[13px] font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {resetLoading && <Loader2 size={14} className="animate-spin" />}
                    {resetLoading ? 'Enviando...' : 'Enviar link'}
                  </button>
                </form>
              </>
            )}
          </div>
        ) : (
          /* ── Login card ── */
          <div className="bg-surface-0 border border-surface-3 rounded-xl p-6">
            <h1 className="text-[18px] font-medium text-text-primary mb-1">Iniciar sesión</h1>
            <p className="text-[13px] text-text-muted mb-6">Ingresa tus credenciales para continuar</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] text-text-muted uppercase tracking-wider mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="correo@ejemplo.com"
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] text-text-muted uppercase tracking-wider">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowReset(true); setResetEmail(email) }}
                    className="text-[11px] text-brand-300 hover:text-brand-200 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
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

              {error && (
                <div className="bg-red-950 border border-red-900 rounded-lg px-3 py-2.5 text-[12px] text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-400 hover:bg-brand-300 disabled:opacity-50 disabled:cursor-not-allowed text-brand-100 rounded-lg py-2.5 text-[13px] font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-[11px] text-text-faint mt-4">
          AutoGestión MX · v1.0 MVP
        </p>
      </div>
    </div>
  )
}
