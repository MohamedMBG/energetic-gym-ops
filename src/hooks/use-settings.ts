import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Settings } from '@/lib/types';

// Backend stores 'name', frontend uses 'gymName'. This adapter normalises both directions.
interface ApiSettings {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  reminderDays: number;
  currency: string;
}

function fromApi(s: ApiSettings): Settings {
  return {
    gymName: s.name,
    monthlyPrice: s.monthlyPrice,
    annualPrice: s.annualPrice,
    reminderDays: s.reminderDays,
    currency: s.currency,
  };
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => fromApi(await api.get<ApiSettings>('/api/settings')),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Settings>) => {
      const { gymName, ...rest } = data;
      return api.put<ApiSettings>('/api/settings', {
        ...(gymName !== undefined ? { name: gymName } : {}),
        ...rest,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
