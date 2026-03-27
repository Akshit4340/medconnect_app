import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useDoctors(filters?: {
  specialisation?: string;
  isAvailable?: boolean;
}) {
  return useQuery({
    queryKey: ['doctors', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.specialisation)
        params.set('specialisation', filters.specialisation);
      if (filters?.isAvailable !== undefined)
        params.set('isAvailable', String(filters.isAvailable));
      const res = await api.get(`/doctors/search?${params}`);
      return res.data;
    },
  });
}

export function useDoctor(id: string) {
  return useQuery({
    queryKey: ['doctor', id],
    queryFn: async () => {
      const res = await api.get(`/doctors/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}
