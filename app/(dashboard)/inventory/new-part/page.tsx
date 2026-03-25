'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { useWorkshopStore } from '@/stores/workshop.store'
import { createClient } from '@/lib/supabase/client'
import { useMutation } from '@tanstack/react-query'
import { ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const UNITS = ['pza', 'jgo', 'lt', 'kg', 'metro', 'par', 'caja', 'set']

export default function NewPartPage() {
  const router = useRouter()
  const { activeWorkshop } = useWorkshopStore()
  const [form, setForm] = useState({ name: '', description: '', sku: '', unit: 'pza', salePrice: '', minStock: '' })

  const createPart = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('parts')
        .insert({
          workshop_id: activeWorkshop!.id,
          name: form.name,
          description: form.description || null,
          sku: form.sku || null,
          unit: form.unit,
          sale_price: parseFloat(form.salePrice) || 0,
          min_stock: parseFloat(form.minStock) || 0,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select().single()
      if (error) throw error
      await supabase.from('inventory_stock').insert({
        workshop_id: activeWorkshop!.id,
        part_id: data.id,
        quantity_on_hand: 0,
        average_cost: 0,
      })
      return data
    },
    onSuccess: () => router.push('/inventory'),
  })

  return (
    <div>
      <Topbar title="Nueva refacción" actions={
        <Link href="/inventory" className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors">
          <ChevronLeft size={13} /> Volver
        </Link>
      } />
      <div className="p-6 max-w-xl">
        <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-3">
            <h2 className="text-[14px] font-medium text-text-primary">Datos de la refacción</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Nombre *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Filtro de aceite Toyota" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Descripción</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción opcional..." rows={2} className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">SKU / Código</label>
                <input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} placeholder="FIL-TOY-001" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Unidad *</label>
                <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Precio de venta *</label>
                <input type="number" step="0.01" min="0" value={form.salePrice} onChange={e => setForm(p => ({ ...p, salePrice: e.target.value }))} placeholder="0.00" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Inventario mínimo</label>
                <input type="number" step="0.01" min="0" value={form.minStock} onChange={e => setForm(p => ({ ...p, minStock: e.target.value }))} placeholder="0" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors" />
              </div>
            </div>
            <button onClick={() => createPart.mutate()} disabled={!form.name || !form.salePrice || createPart.isPending} className="w-full flex items-center justify-center gap-2 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 py-2.5 rounded-lg text-[12px] font-medium transition-colors mt-2">
              {createPart.isPending && <Loader2 size={12} className="animate-spin" />}
              Guardar refacción
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
