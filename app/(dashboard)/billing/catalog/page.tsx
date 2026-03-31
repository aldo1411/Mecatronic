'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useWorkshopStore } from '@/stores/workshop.store'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/utils'
import { Pagination } from '@/components/shared/Pagination'
import { Plus, X, Loader2, Search, Pencil } from 'lucide-react'

type Service = { id: string; name: string; description: string | null; default_price: number }
type ServiceForm = { name: string; description: string; defaultPrice: string }

const EMPTY_FORM: ServiceForm = { name: '', description: '', defaultPrice: '' }
const PAGE_SIZE = 15

export default function ServiceCatalogPage() {
  const { activeWorkshop } = useWorkshopStore()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<ServiceForm>(EMPTY_FORM)

  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editForm, setEditForm]             = useState<ServiceForm>(EMPTY_FORM)

  const { data: result, isLoading } = useQuery({
    queryKey: ['service-catalog', activeWorkshop?.id, search, page],
    queryFn: async () => {
      const supabase = createClient()
      const from = (page - 1) * PAGE_SIZE
      const to   = from + PAGE_SIZE - 1
      let query = supabase
        .from('service_catalog')
        .select('id, name, description, default_price', { count: 'exact' })
        .eq('workshop_id', activeWorkshop!.id)
        .eq('is_active', true)
        .order('name')
        .range(from, to)
      if (search) query = query.ilike('name', `%${search}%`)
      const { data, count } = await query
      return { data: (data ?? []) as Service[], total: count ?? 0 }
    },
    enabled: !!activeWorkshop,
  })

  const services = result?.data ?? []
  const total    = result?.total ?? 0

  const invalidate = () => qc.invalidateQueries({ queryKey: ['service-catalog'] })

  const createService = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { error } = await supabase.from('service_catalog').insert({
        workshop_id:   activeWorkshop!.id,
        name:          createForm.name,
        description:   createForm.description || null,
        default_price: parseFloat(createForm.defaultPrice) || 0,
        created_by:    (await supabase.auth.getUser()).data.user?.id,
      })
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setShowCreate(false); setCreateForm(EMPTY_FORM) },
  })

  const updateService = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('service_catalog')
        .update({
          name:          editForm.name,
          description:   editForm.description || null,
          default_price: parseFloat(editForm.defaultPrice) || 0,
        })
        .eq('id', editingService!.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setEditingService(null) },
  })

  function openEdit(s: Service) {
    setEditingService(s)
    setEditForm({ name: s.name, description: s.description ?? '', defaultPrice: String(s.default_price) })
  }

  return (
    <div>
      <Topbar
        title="Catálogo de servicios"
        subtitle="Mano de obra y servicios estándar del taller"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 text-brand-100 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
          >
            <Plus size={13} /> Nuevo servicio
          </button>
        }
      />

      <div className="p-6">
        <div className="mb-4">
          <div className="relative w-[260px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nombre..."
              className="w-full bg-surface-0 border border-surface-3 rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
            />
          </div>
        </div>

        <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-surface-3">
                {['Servicio', 'Descripción', 'Precio base', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[12px] text-text-faint">Cargando...</td></tr>
              ) : services.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[12px] text-text-faint">
                  {search ? 'Sin resultados para tu búsqueda' : 'Sin servicios en el catálogo'}
                </td></tr>
              ) : services.map(s => (
                <tr key={s.id} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{s.name}</td>
                  <td className="px-4 py-3 text-[12px] text-text-muted max-w-xs truncate">{s.description ?? '—'}</td>
                  <td className="px-4 py-3 text-[12px] font-medium text-text-primary">{formatCurrency(s.default_price)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 text-text-faint hover:text-text-primary transition-colors rounded hover:bg-surface-2"
                    >
                      <Pencil size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <ServiceModal
          title="Nuevo servicio"
          form={createForm}
          onChange={setCreateForm}
          onClose={() => { setShowCreate(false); setCreateForm(EMPTY_FORM) }}
          onSubmit={() => createService.mutate()}
          isPending={createService.isPending}
          submitLabel="Guardar servicio"
        />
      )}

      {/* Edit modal */}
      {editingService && (
        <ServiceModal
          title="Editar servicio"
          form={editForm}
          onChange={setEditForm}
          onClose={() => setEditingService(null)}
          onSubmit={() => updateService.mutate()}
          isPending={updateService.isPending}
          submitLabel="Guardar cambios"
        />
      )}
    </div>
  )
}

function ServiceModal({
  title, form, onChange, onClose, onSubmit, isPending, submitLabel,
}: {
  title: string
  form: ServiceForm
  onChange: (f: ServiceForm) => void
  onClose: () => void
  onSubmit: () => void
  isPending: boolean
  submitLabel: string
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-md animate-fadeIn">
        <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-text-primary">{title}</h2>
          <button onClick={onClose} className="text-text-faint hover:text-text-muted"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Nombre *</label>
            <input
              value={form.name}
              onChange={e => onChange({ ...form, name: e.target.value })}
              placeholder="Cambio de aceite y filtro"
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Descripción</label>
            <input
              value={form.description}
              onChange={e => onChange({ ...form, description: e.target.value })}
              placeholder="Descripción del servicio"
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Precio base *</label>
            <input
              type="number" step="0.01" min="0"
              value={form.defaultPrice}
              onChange={e => onChange({ ...form, defaultPrice: e.target.value })}
              placeholder="0.00"
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
            />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={!form.name || isPending}
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
          >
            {isPending && <Loader2 size={12} className="animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
