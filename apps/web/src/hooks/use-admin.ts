import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface AdminStats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  appointmentsByStatus: Record<string, number>;
}

// BUG FIX: Removed nested useQuery inside queryFn — React hooks cannot be
// called inside async callbacks. Now returns the API data directly.
export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await api.get('/appointments/admin/stats');
      return res.data.data as AdminStats;
    },
  });
}

export function useAdminUsers(params?: { limit?: number; cursor?: string }) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.cursor) searchParams.set('cursor', params.cursor);
      const res = await api.get(`/patients?${searchParams}`);
      return res.data;
    },
  });
}

export function useAdminAppointments(params?: {
  status?: string;
  limit?: number;
  cursor?: string;
}) {
  return useQuery({
    queryKey: ['admin', 'appointments', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.cursor) searchParams.set('cursor', params.cursor);
      const res = await api.get(`/appointments?${searchParams}`);
      return res.data;
    },
  });
}
