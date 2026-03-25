'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useSuppliers, useUpdateSupplier, useDeactivateSupplier, SUPPLIERS_PAGE_SIZE } from '@/hooks/useInventory'
import { useWorkshopStore } from '@/stores/workshop.store'
import { createClient } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Loader2, Building2, Pencil, Phone, Mail, Search, ChevronLeft, ChevronRight, ArrowUpDown, Trash2 } from 'lucide-react'
import { toast } from '@/components/shared/Toast'
import { parseDbError } from '@/lib/supabase/errors'

type Supplier = {
  id: string; name: string
  contact_name: string | null; rfc: string | null
  phone: string | null; email: string | null
}
type FormState = { name: string; contactName: string; rfc: string; phone: string; email: string }

const emptyForm: FormState = { name: '', contactName: '', rfc: '', phone: '', email: '' }

const FIELDS: { label: string; key: keyof FormState; placeholder: string; type?: string }[] = [
  { label: 'Nombre del proveedor *', key: 'name',        placeholder: 'Refaccionaria del Norte' },
  { label: 'Nombre del contacto',    key: 'contactName', placeholder: 'Carlos Mendoza' },
  { label: 'RFC',                    key: 'rfc',         placeholder: 'RNO123456789' },
  { label: 'Teléfono',               key: 'phone',       placeholder: '81 1234 5678', type: 'tel' },
  { label: 'Correo electrónico',     key: 'email',       placeholder: 'ventas@proveedor.com', type: 'email' },
]

function SupplierModal({ title, form, setForm, isPending, onSave, onClose }: {
  title: string
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  isPending: boolean
  onSave: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-md animate-fadeIn">
        <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-text-primary">{title}</h2>
          <button onClick={onClose} className="text-text-faint hover:text-text-muted transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          {FIELDS.map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">{label}</label>
              <input
                type={type ?? 'text'}
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
              />
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
          <button
            onClick={onSave}
            disabled={!form.name || isPending}
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
          >
            {isPending && <Loader2 size={12} className="animate-spin" />}
            Guardar proveedor
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SuppliersPage() {
  const { activeWorkshop } = useWorkshopStore()
  const qc = useQueryClient()
  const updateSupplier   = useUpdateSupplier()
  const deactivateSupplier = useDeactivateSupplier()

  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<FormState>(emptyForm)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)
  const [confirmDeactivate, setConfirmDeactivate] = useState<Supplier | null>(null)

  const { data: suppliersData, isLoading, isFetching } = useSuppliers({ search: search || undefined, page, sortDir })
  const suppliers  = suppliersData?.data ?? []
  const total      = suppliersData?.total ?? 0
  const totalPages = Math.ceil(total / SUPPLIERS_PAGE_SIZE)

  function handleSearch(value: string) { setSearch(value); setPage(1) }
  function toggleSort() { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1) }

  const createSupplier = useMutation({
    mutationFn: async (data: FormState) => {
      const supabase = createClient()
      const { error } = await supabase.from('suppliers').insert({
        workshop_id:  activeWorkshop!.id,
        name:         data.name,
        contact_name: data.contactName || null,
        rfc:          data.rfc || null,
        phone:        data.phone || null,
        email:        data.email || null,
      })
      if (error) throw new Error(parseDbError(error))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Proveedor creado')
      setShowCreate(false)
      setCreateForm(emptyForm)
    },
  })

  function openEdit(s: Supplier) {
    setEditForm({ name: s.name, contactName: s.contact_name ?? '', rfc: s.rfc ?? '', phone: s.phone ?? '', email: s.email ?? '' })
    setEditingSupplier(s)
  }

  function handleSaveEdit() {
    if (!editingSupplier) return
    updateSupplier.mutate(
      {
        supplierId: editingSupplier.id,
        payload: {
          name:         editForm.name,
          contact_name: editForm.contactName || null,
          rfc:          editForm.rfc || null,
          phone:        editForm.phone || null,
          email:        editForm.email || null,
        },
      },
      {
        onSuccess: () => { toast.success('Proveedor actualizado'); setEditingSupplier(null) },
        onError:   (e) => toast.error('Error al guardar', e instanceof Error ? e.message : undefined),
      }
    )
  }

  return (
    <div>
      <Topbar
        title="Proveedores"
        subtitle={`${total} proveedores registrados`}
        actions={
          <button
            onClick={() => { setCreateForm(emptyForm); setShowCreate(true) }}
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 text-brand-100 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
          >
            <Plus size={13} /> Nuevo proveedor
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Search + sort */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full bg-surface-0 border border-surface-3 rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
            />
          </div>
          <button
            onClick={toggleSort}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-0 border border-surface-3 rounded-lg text-[12px] text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowUpDown size={12} />
            Nombre {sortDir === 'asc' ? 'A→Z' : 'Z→A'}
          </button>
        </div>

        <div className="relative bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          {isFetching && !isLoading && (
            <div className="absolute inset-0 bg-surface-1/60 backdrop-blur-[1px] z-10 rounded-xl" />
          )}
          {isLoading ? (
            <div className="p-8 text-center text-[12px] text-text-faint">Cargando...</div>
          ) : suppliers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[13px] text-text-muted">{search ? 'Sin resultados para esa búsqueda' : 'Sin proveedores registrados'}</p>
              {!search && (
                <button onClick={() => setShowCreate(true)} className="mt-2 text-[12px] text-brand-300 hover:text-brand-200 transition-colors">
                  + Agregar primer proveedor
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-surface-3/50">
                {suppliers.map(s => (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2/50 transition-colors">
                    <div className="w-9 h-9 bg-surface-2 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 size={16} className="text-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-primary">{s.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {s.contact_name && <p className="text-[11px] text-text-faint">Contacto: {s.contact_name}</p>}
                        {s.rfc          && <p className="text-[11px] text-text-faint">RFC: {s.rfc}</p>}
                        {s.phone        && <p className="flex items-center gap-1 text-[11px] text-text-faint"><Phone size={10} /> {s.phone}</p>}
                        {s.email        && <p className="flex items-center gap-1 text-[11px] text-text-faint"><Mail size={10} /> {s.email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-text-faint hover:text-text-primary transition-colors rounded-lg hover:bg-surface-2">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmDeactivate(s)} className="p-1.5 text-text-faint hover:text-red-400 transition-colors rounded-lg hover:bg-surface-2">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-surface-3">
                  <p className="text-[11px] text-text-faint">{total} proveedores · página {page} de {totalPages}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 text-text-faint hover:text-text-primary disabled:opacity-30 transition-colors">
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="p-1.5 text-text-faint hover:text-text-primary disabled:opacity-30 transition-colors">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <SupplierModal
          title="Nuevo proveedor"
          form={createForm}
          setForm={setCreateForm}
          isPending={createSupplier.isPending}
          onSave={() => createSupplier.mutate(createForm)}
          onClose={() => setShowCreate(false)}
        />
      )}

      {confirmDeactivate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-sm animate-fadeIn p-6">
            <h2 className="text-[15px] font-medium text-text-primary mb-2">¿Eliminar proveedor?</h2>
            <p className="text-[12px] text-text-muted mb-5">
              <strong className="text-text-primary">{confirmDeactivate.name}</strong> dejará de aparecer en el sistema. Esta acción se puede revertir desde la base de datos.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeactivate(null)} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
              <button
                onClick={() => deactivateSupplier.mutate(confirmDeactivate.id, {
                  onSuccess: () => { toast.success('Proveedor eliminado'); setConfirmDeactivate(null) },
                  onError:   () => toast.error('Error al eliminar'),
                })}
                disabled={deactivateSupplier.isPending}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
              >
                {deactivateSupplier.isPending && <Loader2 size={12} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSupplier && (
        <SupplierModal
          title="Editar proveedor"
          form={editForm}
          setForm={setEditForm}
          isPending={updateSupplier.isPending}
          onSave={handleSaveEdit}
          onClose={() => setEditingSupplier(null)}
        />
      )}
    </div>
  )
}
