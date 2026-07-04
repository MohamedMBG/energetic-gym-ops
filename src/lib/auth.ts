import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Permission } from './types';

export interface AuthUser {
  id: string;
  email: string;
  gymId: string;
  fullName: string;
  roleId: string | null;
  roleName: string | null;
  isOwner: boolean;
  permissions: Permission[];
}

export interface AuthGym {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  reminderDays: number;
  currency: string;
}

export interface AuthState {
  user: AuthUser;
  gym: AuthGym;
}

export function fetchMe(): Promise<AuthState> {
  return api.get<AuthState>('/api/auth/me');
}

export function useAuth() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHasPermission(permission: Permission): boolean {
  const { data } = useAuth();
  if (!data) return false;
  return data.user.isOwner || data.user.permissions.includes(permission);
}
