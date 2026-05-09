import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Client } from '@/lib/types';

type CreateClientPayload = Omit<Client, 'id'>;
type UpdateClientPayload = Partial<CreateClientPayload>;

export function useClients(search?: string) {
  const path = search
    ? `/api/clients?search=${encodeURIComponent(search)}`
    : '/api/clients';
  return useQuery({
    queryKey: ['clients', search ?? ''],
    queryFn: () => api.get<Client[]>(path),
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClientPayload) => api.post<Client>('/api/clients', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientPayload }) =>
      api.put<Client>(`/api/clients/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
