'use client'
import { useState, useRef } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useWorkshopStore } from '@/stores/workshop.store'
import {
  useWorkshop, useUpdateWorkshop, useUploadWorkshopLogo,
  useMyProfile, useUpdateMyProfile, useUpdatePassword,
  useTeamMembers, useUpdateMemberRole, useSetMemberActive, useInviteTeamMember, useRoles,
} from '@/hooks/useSettings'
import { toast } from '@/components/shared/Toast'
import { Loader2, Upload, X, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'workshop' | 'profile' | 'team'

const ROLE_LABELS: Record<string, string> = {
  owner:         'Propietario',
  admin:         'Administrador',
  mechanic:      'Mecánico',
  receptionist:  'Recepcionista',
  superadmin:    'Superadmin',
}

function initials(name: string, lastName: string) {
  return `${name[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

// ─── Tab: Datos del taller ────────────────────────────────────────────────────

function WorkshopTab({ workshopId }: { workshopId: string }) {
  const { data: ws, isLoading } = useWorkshop(workshopId)
  const update = useUpdateWorkshop(workshopId)
  const uploadLogo = useUploadWorkshopLogo(workshopId)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({ name: '', rfc: '', phone: '', address: '', taxRate: '' })
  const [initialized, setInitialized] = useState(false)

  if (ws && !initialized) {
    setForm({ name: ws.name, rfc: ws.rfc ?? '', phone: ws.phone ?? '', address: ws.address ?? '', taxRate: String(ws.tax_rate * 100) })
    setInitialized(true)
  }

  function handleSave() {
    const taxRateNum = parseFloat(form.taxRate)
    update.mutate(
      { name: form.name, rfc: form.rfc || null, phone: form.phone || null, address: form.address || null, tax_rate: !isNaN(taxRateNum) ? taxRateNum / 100 : undefined },
      {
        onSuccess: () => toast.success('Cambios guardados'),
        onError: (e) => toast.error('Error al guardar', e instanceof Error ? e.message : undefined),
      }
    )
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadLogo.mutate(file, {
      onSuccess: () => toast.success('Logo actualizado'),
      onError: () => toast.error('Error al subir el logo'),
    })
    e.target.value = ''
  }

  if (isLoading) return <SectionLoader />

  return (
    <div className="space-y-6 max-w-lg">
      {/* Logo */}
      <div>
        <p className="text-[11px] text-text-faint uppercase tracking-wider mb-3">Logo del taller</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-surface-2 border border-surface-3 overflow-hidden flex items-center justify-center flex-shrink-0">
            {ws?.logo_url ? (
              <img src={ws.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[20px] font-bold text-text-faint">{form.name[0] ?? '?'}</span>
            )}
          </div>
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadLogo.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-surface-3 rounded-lg text-[12px] text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {uploadLogo.isPending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploadLogo.isPending ? 'Subiendo...' : 'Cambiar logo'}
            </button>
            <p className="text-[10px] text-text-faint mt-1">JPG, PNG o WebP · máx 2 MB</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-surface-3" />

      {/* Fields */}
      <div className="space-y-4">
        <Field label="Nombre del taller *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Taller Mecatronic" />
        <Field label="RFC" value={form.rfc} onChange={v => setForm(p => ({ ...p, rfc: v }))} placeholder="TAL123456ABC" />
        <Field label="Teléfono" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="81 1234 5678" />
        <Field label="Dirección" value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="Av. Constitución 100, Monterrey, NL" />
        <div>
          <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">IVA (%)</label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.taxRate}
              onChange={e => setForm(p => ({ ...p, taxRate: e.target.value }))}
              placeholder="16"
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 pr-8 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-text-faint">%</span>
          </div>
          <p className="text-[10px] text-text-faint mt-1">Se aplica al calcular el total de las órdenes de cobro</p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!form.name || update.isPending}
        className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
      >
        {update.isPending && <Loader2 size={12} className="animate-spin" />}
        Guardar cambios
      </button>
    </div>
  )
}

// ─── Tab: Mi perfil ───────────────────────────────────────────────────────────

function ProfileTab() {
  const { data: profile, isLoading } = useMyProfile()
  const updateProfile = useUpdateMyProfile()
  const updatePwd = useUpdatePassword()

  const [form, setForm] = useState({ name: '', last_name: '', second_last_name: '' })
  const [initialized, setInitialized] = useState(false)
  const [pwdForm, setPwdForm] = useState({ new: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)

  if (profile && !initialized) {
    setForm({ name: profile.name, last_name: profile.last_name, second_last_name: profile.second_last_name ?? '' })
    setInitialized(true)
  }

  function handleSaveProfile() {
    if (!profile) return
    updateProfile.mutate(
      { profileId: profile.id, payload: { name: form.name, last_name: form.last_name, second_last_name: form.second_last_name || null } },
      {
        onSuccess: () => toast.success('Perfil actualizado'),
        onError: () => toast.error('Error al guardar perfil'),
      }
    )
  }

  function handleSavePwd() {
    if (pwdForm.new !== pwdForm.confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (pwdForm.new.length < 8) {
      toast.error('Mínimo 8 caracteres')
      return
    }
    updatePwd.mutate(pwdForm.new, {
      onSuccess: () => {
        toast.success('Contraseña actualizada')
        setPwdForm({ new: '', confirm: '' })
        setShowPwd(false)
      },
      onError: (e) => toast.error('Error', e instanceof Error ? e.message : undefined),
    })
  }

  if (isLoading) return <SectionLoader />

  return (
    <div className="space-y-8 max-w-lg">
      {/* Nombre */}
      <div className="space-y-4">
        <p className="text-[11px] text-text-faint uppercase tracking-wider">Información personal</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Juan" />
          <Field label="Apellido paterno *" value={form.last_name} onChange={v => setForm(p => ({ ...p, last_name: v }))} placeholder="García" />
          <div className="col-span-2">
            <Field label="Apellido materno" value={form.second_last_name} onChange={v => setForm(p => ({ ...p, second_last_name: v }))} placeholder="López" />
          </div>
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={!form.name || !form.last_name || updateProfile.isPending}
          className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
        >
          {updateProfile.isPending && <Loader2 size={12} className="animate-spin" />}
          Guardar
        </button>
      </div>

      <div className="border-t border-surface-3" />

      {/* Contraseña */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-text-faint uppercase tracking-wider">Contraseña</p>
          <button onClick={() => setShowPwd(p => !p)} className="text-[11px] text-brand-300 hover:text-brand-200 transition-colors">
            {showPwd ? 'Cancelar' : 'Cambiar contraseña'}
          </button>
        </div>
        {showPwd && (
          <div className="space-y-3">
            <Field label="Nueva contraseña" value={pwdForm.new} onChange={v => setPwdForm(p => ({ ...p, new: v }))} placeholder="Mínimo 8 caracteres" type="password" />
            <Field label="Confirmar contraseña" value={pwdForm.confirm} onChange={v => setPwdForm(p => ({ ...p, confirm: v }))} placeholder="Repite la contraseña" type="password" />
            <button
              onClick={handleSavePwd}
              disabled={!pwdForm.new || !pwdForm.confirm || updatePwd.isPending}
              className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
            >
              {updatePwd.isPending && <Loader2 size={12} className="animate-spin" />}
              Actualizar contraseña
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Equipo ──────────────────────────────────────────────────────────────

function TeamTab({ workshopId }: { workshopId: string }) {
  const { data: members, isLoading } = useTeamMembers(workshopId)
  const { data: roles } = useRoles()
  const updateRole = useUpdateMemberRole(workshopId)
  const setActive = useSetMemberActive(workshopId)
  const invite = useInviteTeamMember(workshopId)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', last_name: '', role: 'mechanic' as 'admin' | 'mechanic' | 'receptionist' })

  function handleInvite() {
    invite.mutate(inviteForm, {
      onSuccess: () => {
        toast.success('Invitación enviada', `Se envió un correo a ${inviteForm.email}`)
        setShowInvite(false)
        setInviteForm({ email: '', name: '', last_name: '', role: 'mechanic' })
      },
    })
  }

  if (isLoading) return <SectionLoader />

  const activeMembers  = (members ?? []).filter(m => m.is_active)
  const inactiveMembers = (members ?? []).filter(m => !m.is_active)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-text-muted">{activeMembers.length} miembro{activeMembers.length !== 1 ? 's' : ''} activo{activeMembers.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 text-brand-100 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
        >
          <UserPlus size={13} /> Invitar miembro
        </button>
      </div>

      {/* Active members */}
      <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden">
        {activeMembers.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12px] text-text-faint">Sin miembros activos</p>
        ) : activeMembers.map(m => (
          <MemberRow
            key={m.id}
            member={m}
            roles={roles ?? []}
            onRoleChange={(roleId) => updateRole.mutate({ membershipId: m.id, roleId }, {
              onError: () => toast.error('Error al cambiar rol'),
            })}
            onDeactivate={() => setActive.mutate({ membershipId: m.id, isActive: false }, {
              onSuccess: () => toast.success('Acceso desactivado'),
              onError: () => toast.error('Error al desactivar'),
            })}
          />
        ))}
      </div>

      {/* Inactive members */}
      {inactiveMembers.length > 0 && (
        <div>
          <p className="text-[11px] text-text-faint uppercase tracking-wider mb-2">Sin acceso</p>
          <div className="bg-surface-0 border border-surface-3 rounded-xl overflow-hidden opacity-60">
            {inactiveMembers.map(m => (
              <MemberRow
                key={m.id}
                member={m}
                roles={roles ?? []}
                inactive
                onReactivate={() => setActive.mutate({ membershipId: m.id, isActive: true }, {
                  onSuccess: () => toast.success('Acceso reactivado'),
                  onError: () => toast.error('Error al reactivar'),
                })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-0 border border-surface-3 rounded-xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-text-primary">Invitar al equipo</h2>
              <button onClick={() => setShowInvite(false)} className="text-text-faint hover:text-text-muted transition-colors"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <Field label="Correo electrónico *" value={inviteForm.email} onChange={v => setInviteForm(p => ({ ...p, email: v }))} placeholder="nombre@correo.com" type="email" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre *" value={inviteForm.name} onChange={v => setInviteForm(p => ({ ...p, name: v }))} placeholder="Juan" />
                <Field label="Apellido *" value={inviteForm.last_name} onChange={v => setInviteForm(p => ({ ...p, last_name: v }))} placeholder="García" />
              </div>
              <div>
                <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">Rol *</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm(p => ({ ...p, role: e.target.value as typeof inviteForm.role }))}
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary outline-none focus:border-brand-400 transition-colors"
                >
                  <option value="mechanic">Mecánico</option>
                  <option value="receptionist">Recepcionista</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end">
              <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-[12px] text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
              <button
                onClick={handleInvite}
                disabled={!inviteForm.email || !inviteForm.name || !inviteForm.last_name || invite.isPending}
                className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-brand-100 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
              >
                {invite.isPending && <Loader2 size={12} className="animate-spin" />}
                Enviar invitación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MemberRow ────────────────────────────────────────────────────────────────

function MemberRow({ member, roles, inactive, onRoleChange, onDeactivate, onReactivate }: {
  member: { id: string; user_id: string; role_id: string; profiles: { name: string; last_name: string }; roles: { id: string; name: string } }
  roles: { id: string; name: string }[]
  inactive?: boolean
  onRoleChange?: (roleId: string) => void
  onDeactivate?: () => void
  onReactivate?: () => void
}) {
  const roleName = member.roles?.name ?? ''
  const isOwner = roleName === 'owner'

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-3/40 last:border-0">
      <div className="w-8 h-8 rounded-full bg-brand-950 flex items-center justify-center text-[11px] font-medium text-brand-300 flex-shrink-0">
        {initials(member.profiles.name, member.profiles.last_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-text-primary truncate">
          {member.profiles.name} {member.profiles.last_name}
        </p>
        {!inactive && !isOwner && (
          <select
            value={member.role_id}
            onChange={e => onRoleChange?.(e.target.value)}
            className="mt-0.5 bg-transparent text-[11px] text-text-faint outline-none cursor-pointer hover:text-text-muted transition-colors"
          >
            {[{ id: member.role_id, name: roleName }, ...roles.filter(r => r.id !== member.role_id)].map(r => (
              <option key={r.id} value={r.id}>{ROLE_LABELS[r.name] ?? r.name}</option>
            ))}
          </select>
        )}
        {(inactive || isOwner) && (
          <p className="text-[11px] text-text-faint mt-0.5">{ROLE_LABELS[roleName] ?? roleName}</p>
        )}
      </div>
      {!isOwner && (
        inactive ? (
          <button onClick={onReactivate} className="text-[11px] text-brand-300 hover:text-brand-200 transition-colors px-2 py-1">Reactivar</button>
        ) : (
          <button onClick={onDeactivate} className="text-[11px] text-text-faint hover:text-red-400 transition-colors px-2 py-1">Quitar acceso</button>
        )
      )}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-[10px] text-text-faint uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint outline-none focus:border-brand-400 transition-colors"
      />
    </div>
  )
}

function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={18} className="animate-spin text-brand-300" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'workshop', label: 'Taller' },
  { id: 'profile',  label: 'Mi perfil' },
  { id: 'team',     label: 'Equipo' },
]

export default function SettingsPage() {
  const { activeWorkshop } = useWorkshopStore()
  const [tab, setTab] = useState<Tab>('workshop')

  return (
    <div>
      <Topbar title="Configuración" />
      <div className="p-6">
        {/* Tab nav */}
        <div className="flex gap-1 mb-6 border-b border-surface-3">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 text-[13px] border-b-2 -mb-px transition-colors',
                tab === t.id
                  ? 'border-brand-400 text-text-primary font-medium'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'workshop' && activeWorkshop && <WorkshopTab workshopId={activeWorkshop.id} />}
        {tab === 'profile'  && <ProfileTab />}
        {tab === 'team'     && activeWorkshop && <TeamTab workshopId={activeWorkshop.id} />}
      </div>
    </div>
  )
}
