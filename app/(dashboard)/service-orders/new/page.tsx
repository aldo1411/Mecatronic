'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { useWorkshopStore } from '@/stores/workshop.store'
import { createWorkOrder } from '@/services/work-orders'
import { getClients, getVehiclesByClient, createVehicle, createClient_ } from '@/services/clients'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ChevronLeft, Search, Loader2, Car, User, Wrench } from 'lucide-react'
import { toast } from '@/components/shared/Toast'
import Link from 'next/link'
import type { Profile, Vehicle } from '@/types/database'

const CURRENT_YEAR = new Date().getFullYear()


type Step = 'client' | 'vehicle' | 'details'

export default function NewServiceOrderPage() {
  const router = useRouter()
  const { activeWorkshop } = useWorkshopStore()
  const [step, setStep] = useState<Step>('client')
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [clientMode, setClientMode] = useState<'select' | 'new'>('select')
  const [vehicleMode, setVehicleMode] = useState<'select' | 'new'>('select')

  // New client form
  const [newClient, setNewClient] = useState({ name: '', lastName: '', secondLastName: '', rfc: '', phone: '', email: '' })
  // New vehicle form
  const [newVehicle, setNewVehicle] = useState({ brand: '', model: '', year: CURRENT_YEAR.toString() })
  // Order details
  const [details, setDetails] = useState({ description: '', estimatedDelivery: '', mechanicId: '' })

  const { data: clients } = useQuery({
    queryKey: ['clients', activeWorkshop?.id],
    queryFn: () => getClients(activeWorkshop!.id),
    enabled: !!activeWorkshop,
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', selectedClient?.id],
    queryFn: () => getVehiclesByClient(selectedClient!.id),
    enabled: !!selectedClient,
  })

  const createClientMutation = useMutation({ mutationFn: createClient_ })
  const createVehicleMutation = useMutation({ mutationFn: createVehicle })
  const createOrderMutation = useMutation({
    mutationFn: createWorkOrder,
    onError: () => toast.error('Error al crear la orden de servicio'),
  })

  const filteredClients = (clients?.data ?? []).filter(c => {
    if (!clientSearch) return true
    const s = clientSearch.toLowerCase()
    return `${c.name} ${c.last_name}`.toLowerCase().includes(s)
  })

  async function handleCreateClient() {
    try {
      const client = await createClientMutation.mutateAsync({
        name: newClient.name,
        lastName: newClient.lastName,
        secondLastName: newClient.secondLastName || undefined,
        rfc: newClient.rfc || undefined,
        phone: newClient.phone || undefined,
        email: newClient.email || undefined,
        workshopId: activeWorkshop!.id,
      })
      setSelectedClient(client)
      setClientMode('select')
      setStep('vehicle')
    } catch (e) {
      toast.error('No se pudo registrar el cliente', e instanceof Error ? e.message : undefined)
    }
  }

  async function handleCreateVehicle() {
    const vehicle = await createVehicleMutation.mutateAsync({
      clientId: selectedClient!.id,
      brand: newVehicle.brand,
      model: newVehicle.model,
      year: parseInt(newVehicle.year),
    })
    setSelectedVehicle(vehicle)
    setVehicleMode('select')
    setStep('details')
  }

  async function handleSubmit() {
    if (!selectedClient) { toast.error('Cliente requerido', 'Selecciona un cliente antes de continuar'); return }
    if (!selectedVehicle) { toast.error('Vehículo requerido', 'Selecciona un vehículo antes de continuar'); return }
    if (!activeWorkshop) return
    const order = await createOrderMutation.mutateAsync({
      workshopId: activeWorkshop.id,
      clientId: selectedClient.id,
      vehicleId: selectedVehicle.id,
      description: details.description || undefined,
      estimatedDelivery: details.estimatedDelivery || undefined,
      mechanicId: details.mechanicId || undefined,
    })
    router.push(`/service-orders/detail?id=${order.id}`)
  }

  const STEPS: { key: Step; label: string; icon: typeof User }[] = [
    { key: 'client', label: 'Cliente', icon: User },
    { key: 'vehicle', label: 'Vehículo', icon: Car },
    { key: 'details', label: 'Detalles', icon: Wrench },
  ]

  return (
    <div>
      <Topbar
        title="Nueva orden de servicio"
        actions={
          <Link href="/service-orders" className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft size={13} /> Volver
          </Link>
        }
      />

      <div className="p-6 max-w-2xl">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const stepOrder = ['client','vehicle','details']
            const currentIdx = stepOrder.indexOf(step)
            const sIdx = stepOrder.indexOf(s.key)
            const isDone = sIdx < currentIdx
            const isCurrent = s.key === step
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-colors ${
                  isCurrent ? 'bg-brand-500/30 text-brand-200 border border-brand-400' :
                  isDone ? 'bg-surface-2 text-text-secondary border border-surface-3' :
                  'text-text-faint border border-transparent'
                }`}>
                  <s.icon size={13} />
                  {s.label}
                </div>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-surface-3" />}
              </div>
            )
          })}
        </div>

        {/* Step: Client */}
        {step === 'client' && (
          <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-medium text-text-primary">Seleccionar cliente</h2>
                <p className="text-[12px] text-text-muted mt-0.5">Busca un cliente existente o crea uno nuevo</p>
              </div>
              <div className="flex gap-1 p-1 bg-surface-2 rounded-lg">
                {(['select', 'new'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setClientMode(m)}
                    className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      clientMode === m ? 'bg-surface-0 text-text-primary shadow-sm' : 'text-text-faint hover:text-text-muted'
                    }`}
                  >
                    {m === 'select' ? 'Seleccionar cliente' : 'Nuevo cliente'}
                  </button>
                ))}
              </div>
            </div>

            {clientMode === 'new' ? (
              <div className="p-5 space-y-3">
                <p className="text-[12px] font-medium text-text-secondary mb-3">Datos del nuevo cliente</p>
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
                        value={newClient[key as keyof typeof newClient]}
                        onChange={e => setNewClient(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCreateClient}
                    disabled={!newClient.name || !newClient.lastName || createClientMutation.isPending}
                    className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
                  >
                    {createClientMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                    Crear cliente
                  </button>
                  <button onClick={() => setClientMode('select')} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <div className="relative mb-3">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                  <input
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder="Buscar por nombre..."
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg pl-8 pr-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                  />
                </div>
                <div className="border border-surface-3 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-[12px] text-text-faint">Sin resultados</div>
                  ) : filteredClients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClient(c); setStep('vehicle') }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 border-b border-surface-3/50 last:border-0 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-950 flex items-center justify-center text-[11px] font-medium text-blue-300 flex-shrink-0">
                        {c.name[0]}{c.last_name[0]}
                      </div>
                      <div>
                        <p className="text-[13px] text-text-primary">{c.name} {c.last_name}</p>
                        {c.rfc && <p className="text-[10px] text-text-faint">RFC: {c.rfc}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Vehicle */}
        {step === 'vehicle' && selectedClient && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-950 flex items-center justify-center text-[11px] font-medium text-blue-300">
                {selectedClient.name[0]}{selectedClient.last_name[0]}
              </div>
              <p className="text-[13px] text-text-primary">{selectedClient.name} {selectedClient.last_name}</p>
              <button onClick={() => { setStep('client'); setSelectedClient(null) }} className="ml-auto text-[11px] text-text-faint hover:text-text-muted transition-colors">Cambiar</button>
            </div>

            <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-medium text-text-primary">Seleccionar vehículo</h2>
                  <p className="text-[12px] text-text-muted mt-0.5">Vehículos registrados o agrega uno nuevo</p>
                </div>
                <div className="flex gap-1 p-1 bg-surface-2 rounded-lg">
                  {(['select', 'new'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setVehicleMode(m)}
                      className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                        vehicleMode === m ? 'bg-surface-0 text-text-primary shadow-sm' : 'text-text-faint hover:text-text-muted'
                      }`}
                    >
                      {m === 'select' ? 'Seleccionar vehículo' : 'Nuevo vehículo'}
                    </button>
                  ))}
                </div>
              </div>

              {vehicleMode === 'new' ? (
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Marca *</label>
                      <input
                        value={newVehicle.brand}
                        onChange={e => setNewVehicle(p => ({ ...p, brand: e.target.value }))}
                        placeholder="Ford, Nissan..."
                        className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Modelo *</label>
                      <input
                        value={newVehicle.model}
                        onChange={e => setNewVehicle(p => ({ ...p, model: e.target.value }))}
                        placeholder="Sentra, Jetta..."
                        className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Año *</label>
                      <input
                        type="number"
                        min="1900"
                        max={CURRENT_YEAR}
                        value={newVehicle.year}
                        onChange={e => setNewVehicle(p => ({ ...p, year: e.target.value }))}
                        placeholder={String(CURRENT_YEAR)}
                        className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleCreateVehicle}
                      disabled={!newVehicle.brand || !newVehicle.model || createVehicleMutation.isPending}
                      className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
                    >
                      {createVehicleMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                      Registrar vehículo
                    </button>
                    <button onClick={() => setVehicleMode('select')} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="p-5">
                  {!vehicles || vehicles.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-[12px] text-text-faint">Este cliente no tiene vehículos registrados.</p>
                      <button onClick={() => setVehicleMode('new')} className="mt-2 text-[12px] text-brand-300 hover:text-brand-200 transition-colors">
                        + Registrar primer vehículo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {vehicles.map(v => (
                        <button
                          key={v.id}
                          onClick={() => { setSelectedVehicle(v); setStep('details') }}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-surface-2 hover:bg-surface-3/50 border border-surface-3 rounded-lg transition-colors text-left"
                        >
                          <Car size={16} className="text-text-muted flex-shrink-0" />
                          <div>
                            <p className="text-[13px] font-medium text-text-primary">{v.brand} {v.model} {v.year}</p>
                          </div>
                          <ChevronLeft size={13} className="text-text-faint ml-auto rotate-180" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && selectedClient && selectedVehicle && (
          <div className="space-y-4 animate-fadeIn">
            {/* Summary */}
            <div className="bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-950 flex items-center justify-center text-[10px] font-medium text-blue-300">
                  {selectedClient.name[0]}{selectedClient.last_name[0]}
                </div>
                <p className="text-[12px] text-text-primary">{selectedClient.name} {selectedClient.last_name}</p>
              </div>
              <div className="w-px h-4 bg-surface-3" />
              <div className="flex items-center gap-2">
                <Car size={13} className="text-text-muted" />
                <p className="text-[12px] text-text-primary">{selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year}</p>
              </div>
              <button onClick={() => setStep('vehicle')} className="ml-auto text-[11px] text-text-faint hover:text-text-muted transition-colors">Cambiar</button>
            </div>

            <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-3">
                <h2 className="text-[14px] font-medium text-text-primary">Detalles de la orden</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Diagnóstico / descripción</label>
                  <textarea
                    value={details.description}
                    onChange={e => setDetails(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe el problema o servicio solicitado..."
                    rows={3}
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Entrega estimada</label>
                  <input
                    type="datetime-local"
                    value={details.estimatedDelivery}
                    onChange={e => setDetails(p => ({ ...p, estimatedDelivery: e.target.value }))}
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedClient || !selectedVehicle || createOrderMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
                >
                  {createOrderMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                  Crear orden de servicio
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
