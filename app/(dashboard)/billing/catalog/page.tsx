'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useWorkshopStore } from '@/stores/workshop.store'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/utils'
import { Plus, X, Loader2 } from 'lucide-react'

export default function ServiceCatalogPage() {
  const { activeWorkshop } = useWorkshopStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', defaultPrice: '', taxRate: '0.16' })

  const { data: services, isLoading } = useQuery({
    queryKey: ['service-catalog', activeWorkshop?.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('service_catalog')
        .select('*')
        .eq('is_active', true)
        .order('name')
      return data ?? []
    },
    enabled: !!activeWorkshop,
  })

  const createService = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { error } = await supabase.from('service_catalog').insert({
        workshop_id: activeWorkshop!.id,
        name: form.name,
        description: form.description || null,
        default_price: parseFloat(form.defaultPrice) || 0,
        tax_rate: parseFloat(form.taxRate) || 0.16,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-catalog'] })
      setShowModal(false)
      setForm({ name: '', description: '', defaultPrice: '', taxRate: '0.16' })
    },
  })

  return (
    <div>
      <Topbar
        title="Catálogo de servicios"
        subtitle="Mano de obra y servicios estándar del taller"
        actions={
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 text-brand-100 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors">
            <Plus size={13} /> Nuevo servicio
          </button>
        }
      />
      <div className="p-6">
        <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-surface-3">
                {['Servicio', 'Descripción', 'Precio base', 'IVA', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[12px] text-text-faint">Cargando...</td></tr>
              ) : !services || services.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[12px] text-text-faint">Sin servicios en el catálogo</td></tr>
              ) : services.map((s: { id: string; name: string; description: string | null; default_price: number; tax_rate: number }) => (
                <tr key={s.id} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{s.name}</td>
                  <td className="px-4 py-3 text-[12px] text-text-muted max-w-xs truncate">{s.description ?? '—'}</td>
                  <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(s.default_price)}</td>
                  <td className="px-4 py-3 text-[12px] text-text-muted">{(s.tax_rate * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-[11px] text-text-faint cursor-pointer hover:text-text-muted">···</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-md animate-fadeIn">
            <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-text-primary">Nuevo servicio</h2>
              <button onClick={() => setShowModal(false)} className="text-text-faint hover:text-text-muted"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Nombre *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Cambio de aceite y filtro" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Descripción</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción del servicio" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Precio base *</label>
                  <input type="number" step="0.01" min="0" value={form.defaultPrice} onChange={e => setForm(p => ({ ...p, defaultPrice: e.target.value }))} placeholder="0.00" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Tasa IVA</label>
                  <select value={form.taxRate} onChange={e => setForm(p => ({ ...p, taxRate: e.target.value }))} className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors">
                    <option value="0.16">16%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
              <button onClick={() => createService.mutate()} disabled={!form.name || createService.isPending} className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors">
                {createService.isPending && <Loader2 size={12} className="animate-spin" />}
                Guardar servicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
