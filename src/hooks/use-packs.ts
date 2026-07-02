import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SubscriptionPack } from '@/lib/types';

type CreatePackPayload = Omit<SubscriptionPack, 'id' | 'isDefault'>;
type UpdatePackPayload = Partial<CreatePackPayload>;

export function usePacks() {
  return useQuery({
    queryKey: ['packs'],
    queryFn: () => api.get<SubscriptionPack[]>('/api/packs'),
  });
}

export function useCreatePack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePackPayload) => api.post<SubscriptionPack>('/api/packs', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packs'] });
    },
  });
}

export function useUpdatePack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePackPayload }) =>
      api.put<SubscriptionPack>(`/api/packs/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packs'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeletePack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/packs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packs'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
