'use client'
import Link from 'next/link'
import { CarFront, Wrench } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-1 flex flex-col items-center justify-center p-6">
      {/* Illustration */}
      <div className="relative mb-8 flex items-end justify-center gap-2">
        {/* Road marks */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-px bg-surface-3" />

        {/* Crashed car */}
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-surface-2 border border-surface-3 flex items-center justify-center rotate-[-18deg] translate-y-1 shadow-lg">
            <CarFront size={48} className="text-brand-300" strokeWidth={1.5} />
          </div>
          {/* Impact stars */}
          <span className="absolute -top-3 -right-3 text-[22px] leading-none select-none">💥</span>
        </div>

        {/* Wall / obstacle */}
        <div className="flex flex-col gap-0.5 mb-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-8 h-5 bg-surface-3 border border-surface-2 rounded-sm" />
          ))}
        </div>
      </div>

      {/* 404 */}
      <p className="text-[72px] font-bold text-text-primary leading-none tracking-tighter mb-2">
        404
      </p>

      <p className="text-[16px] font-medium text-text-primary mb-1">
        Página no encontrada
      </p>
      <p className="text-[13px] text-text-faint mb-8 text-center max-w-xs">
        La ruta que buscas no existe o fue removida.
      </p>

      <Link
        href="/"
        className="flex items-center gap-2 bg-brand-400 hover:bg-brand-300 text-brand-100 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
      >
        <Wrench size={14} />
        Volver al taller
      </Link>
    </div>
  )
}
