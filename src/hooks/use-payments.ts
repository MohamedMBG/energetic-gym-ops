import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Payment } from '@/lib/types';

type CreatePaymentPayload = {
  clientId: string;
  amount: number;
  date: string;
  periodStart: string;
  periodEnd: string;
  method: 'Cash' | 'Card' | 'Bank transfer';
  status: 'Paid' | 'Unpaid';
};

export function usePayments(clientId?: string) {
  const path = clientId
    ? `/api/payments?clientId=${encodeURIComponent(clientId)}`
    : '/api/payments';
  return useQuery({
    queryKey: ['payments', clientId ?? ''],
    queryFn: () => api.get<Payment[]>(path),
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePaymentPayload) => api.post<Payment>('/api/payments', data),
    onSuccess: () => {
      // invalidate both payments and clients (backend updates client on Paid)
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
