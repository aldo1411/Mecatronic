import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getWorkshop, updateWorkshop, uploadWorkshopLogo,
  getMyProfile, updateMyProfile, updatePassword,
  getTeamMembers, updateMemberRole, setMemberActive, inviteTeamMember,
  getRoles,
} from '@/services/settings'

// ─── Workshop ─────────────────────────────────────────────────────────────────

export function useWorkshop(workshopId: string | undefined) {
  return useQuery({
    queryKey: ['workshop-settings', workshopId],
    queryFn: () => getWorkshop(workshopId!),
    enabled: !!workshopId,
  })
}

export function useUpdateWorkshop(workshopId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof updateWorkshop>[1]) =>
      updateWorkshop(workshopId!, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workshop-settings', workshopId] }),
  })
}

export function useUploadWorkshopLogo(workshopId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadWorkshopLogo(workshopId!, file)
      await updateWorkshop(workshopId!, { logo_url: url })
      return url
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workshop-settings', workshopId] }),
  })
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
  })
}

export function useUpdateMyProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, payload }: {
      profileId: string
      payload: Parameters<typeof updateMyProfile>[1]
    }) => updateMyProfile(profileId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-profile'] }),
  })
}

export function useUpdatePassword() {
  return useMutation({ mutationFn: updatePassword })
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export function useTeamMembers(workshopId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', workshopId],
    queryFn: () => getTeamMembers(workshopId!),
    enabled: !!workshopId,
  })
}

export function useUpdateMemberRole(workshopId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ membershipId, roleId }: { membershipId: string; roleId: string }) =>
      updateMemberRole(membershipId, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', workshopId] }),
  })
}

export function useSetMemberActive(workshopId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ membershipId, isActive }: { membershipId: string; isActive: boolean }) =>
      setMemberActive(membershipId, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', workshopId] }),
  })
}

export function useInviteTeamMember(workshopId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: inviteTeamMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', workshopId] }),
  })
}

export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: getRoles })
}
