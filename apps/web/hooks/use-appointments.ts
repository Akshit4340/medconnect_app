import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useAppointments(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const res = await api.get(`/appointments?${params}`);
      return res.data;
    },
  });
}

export function useAvailableSlots(doctorId: string, date: string) {
  return useQuery({
    queryKey: ['slots', doctorId, date],
    queryFn: async () => {
      const res = await api.get(
        `/appointments/slots?doctorId=${doctorId}&date=${date}`,
      );
      return res.data.data as {
        startTime: string;
        endTime: string;
        available: boolean;
      }[];
    },
    enabled: !!doctorId && !!date,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      doctorId: string;
      scheduledAt: string;
      durationMinutes?: number;
      notes?: string;
    }) => {
      const res = await api.post('/appointments', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      cancellationReason,
    }: {
      id: string;
      status: string;
      cancellationReason?: string;
    }) => {
      const res = await api.patch(`/appointments/${id}/status`, {
        status,
        cancellationReason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
