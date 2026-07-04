import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Role, StaffMember, StaffPerformance, Permission } from "@/lib/types";

type CreateRolePayload = { name: string; permissions: Permission[] };
type UpdateRolePayload = Partial<CreateRolePayload>;

type CreateStaffPayload = { email: string; password: string; fullName: string; roleId: string };
type UpdateStaffPayload = Partial<{ fullName: string; roleId: string; active: boolean; password: string }>;

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<Role[]>("/api/staff/roles"),
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRolePayload) => api.post<Role>("/api/staff/roles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRolePayload }) =>
      api.put<Role>(`/api/staff/roles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/staff/roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get<StaffMember[]>("/api/staff"),
  });
}

export function useStaffPerformance() {
  return useQuery({
    queryKey: ["staff", "performance"],
    queryFn: () => api.get<StaffPerformance[]>("/api/staff/performance"),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStaffPayload) => api.post<StaffMember>("/api/staff", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffPayload }) =>
      api.put<StaffMember>(`/api/staff/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/staff/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff", "performance"] });
    },
  });
}
