import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Equipment } from '@/lib/types';

type CreateEquipmentPayload = Omit<Equipment, 'id'>;
type UpdateEquipmentPayload = Partial<CreateEquipmentPayload>;

export function useEquipment() {
  return useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.get<Equipment[]>('/api/equipment'),
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEquipmentPayload) => api.post<Equipment>('/api/equipment', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEquipmentPayload }) =>
      api.put<Equipment>(`/api/equipment/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/equipment/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}
