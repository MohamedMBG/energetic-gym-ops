import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Offer } from '@/lib/types';

type CreateOfferPayload = Omit<Offer, 'id'>;
type UpdateOfferPayload = Partial<CreateOfferPayload>;

export function useOffers() {
  return useQuery({
    queryKey: ['offers'],
    queryFn: () => api.get<Offer[]>('/api/offers'),
  });
}

export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOfferPayload) => api.post<Offer>('/api/offers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] });
    },
  });
}

export function useUpdateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOfferPayload }) =>
      api.put<Offer>(`/api/offers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/offers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
