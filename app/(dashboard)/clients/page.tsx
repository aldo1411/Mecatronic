'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { useWorkshopStore } from '@/stores/workshop.store'
import { getClients, createClient_ } from '@/services/clients'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Loader2, X } from 'lucide-react'
import { TableLoader, TableBackdrop } from '@/components/shared/Loader'
import { toast } from '@/components/shared/Toast'

export default function ClientsPage() {
  const { activeWorkshop } = useWorkshopStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', lastName: '', secondLastName: '', rfc: '', phone: '', email: '' })

  const { data: clients, isLoading, isFetching } = useQuery({
    queryKey: ['clients', activeWorkshop?.id],
    queryFn: () => getClients(activeWorkshop!.id),
    enabled: !!activeWorkshop,
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => createClient_({ ...data, workshopId: activeWorkshop!.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setShowModal(false)
      setForm({ name: '', lastName: '', secondLastName: '', rfc: '', phone: '', email: '' })
      toast.success('Cliente registrado correctamente')
    },
    onError: (e) => toast.error('No se pudo registrar el cliente', e instanceof Error ? e.message : undefined),
  })

  const filtered = (clients ?? []).filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return `${c.name} ${c.last_name}`.toLowerCase().includes(s) ||
      c.rfc?.toLowerCase().includes(s)
  })

  return (
    <div>
      <Topbar
        title="Clientes"
        subtitle={`${clients?.length ?? 0} clientes registrados`}
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 text-brand-100 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
          >
            <Plus size={13} /> Nuevo cliente
          </button>
        }
      />

      <div className="p-6">
        <div className="relative mb-5 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o RFC..."
            className="w-full bg-surface-0 border border-surface-3 rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
          />
        </div>

        <div className="relative bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
          <TableBackdrop visible={isFetching && !isLoading} />
          {isLoading ? (
            <div className="p-8 text-center text-[12px] text-text-faint">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[13px] text-text-muted">Sin clientes registrados</p>
              <button onClick={() => setShowModal(true)} className="mt-2 text-[12px] text-brand-300 hover:text-brand-200 transition-colors">
                + Registrar primer cliente
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-surface-3">
                  {['Cliente', 'RFC', 'Contacto', 'Órdenes', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] text-text-faint uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => {
                  const phone = client.contacts?.find((c: { contact_type: string }) => c.contact_type === 'phone')
                  const email = client.contacts?.find((c: { contact_type: string }) => c.contact_type === 'email')
                  return (
                    <tr key={client.id} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-950 flex items-center justify-center text-[11px] font-medium text-blue-300 flex-shrink-0">
                            {client.name[0]}{client.last_name[0]}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-text-primary">{client.name} {client.last_name} {client.second_last_name ?? ''}</p>
                            {email && <p className="text-[11px] text-text-faint">{email.contact}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-text-muted">{client.rfc ?? '—'}</td>
                      <td className="px-4 py-3 text-[12px] text-text-muted">{phone?.contact ?? '—'}</td>
                      <td className="px-4 py-3 text-[12px] text-text-muted">—</td>
                      <td className="px-4 py-3">
                        <Link href={`/clients/detail?id=${client.id}`} className="text-[11px] text-brand-300 hover:text-brand-200 transition-colors">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New client modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-lg animate-fadeIn">
            <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-text-primary">Nuevo cliente</h2>
              <button onClick={() => setShowModal(false)} className="text-text-faint hover:text-text-muted transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Nombre *', key: 'name', placeholder: 'Juan' },
                  { label: 'Apellido paterno *', key: 'lastName', placeholder: 'García' },
                  { label: 'Apellido materno', key: 'secondLastName', placeholder: 'López' },
                  { label: 'RFC', key: 'rfc', placeholder: 'GALO123456' },
                  { label: 'Teléfono', key: 'phone', placeholder: '81 1234 5678' },
                  { label: 'Correo', key: 'email', placeholder: 'correo@ejemplo.com' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">{label}</label>
                    <input
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || !form.lastName || createMutation.isPending}
                className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
              >
                {createMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                Guardar cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
