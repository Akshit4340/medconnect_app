import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
// Use workspace package alias for shared types
import type { Doctor, AvailabilitySlot } from '@medconnect/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DoctorSearchFilters {
  specialisation?: string;
  isAvailable?: boolean;
  limit?: number;
  cursor?: string;
}

interface DoctorSearchResult {
  data: Doctor[];
  hasMore: boolean;
  nextCursor?: string;
}

interface UpdateDoctorData {
  specialisation?: string;
  bio?: string;
  consultationFee?: number;
  isAvailable?: boolean;
}

interface SlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

// ─── Search doctors ───────────────────────────────────────────────────────────

export function useDoctors(filters?: DoctorSearchFilters) {
  return useQuery<DoctorSearchResult>({
    queryKey: ['doctors', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.specialisation) {
        params.set('specialisation', filters.specialisation);
      }
      if (filters?.isAvailable !== undefined) {
        params.set('isAvailable', String(filters.isAvailable));
      }
      if (filters?.limit) {
        params.set('limit', String(filters.limit));
      }
      if (filters?.cursor) {
        params.set('cursor', filters.cursor);
      }
      const res = await api.get(`/doctors/search?${params}`);
      return res.data as DoctorSearchResult;
    },
  });
}

// ─── Get single doctor by ID ──────────────────────────────────────────────────

export function useDoctor(id: string) {
  return useQuery<Doctor>({
    queryKey: ['doctor', id],
    queryFn: async () => {
      const res = await api.get(`/doctors/${id}`);
      return res.data.data as Doctor;
    },
    enabled: !!id,
  });
}

// ─── Get logged-in doctor's own profile ───────────────────────────────────────

export function useMyDoctorProfile() {
  return useQuery<Doctor>({
    queryKey: ['doctor', 'me'],
    queryFn: async () => {
      const res = await api.get('/doctors/me');
      return res.data.data as Doctor;
    },
    retry: false, // Don't retry if no doctor profile exists yet
  });
}

// ─── Get doctor's availability slots ─────────────────────────────────────────

export function useDoctorSlots(doctorId: string) {
  return useQuery<AvailabilitySlot[]>({
    queryKey: ['doctor', doctorId, 'slots'],
    queryFn: async () => {
      const res = await api.get(`/doctors/${doctorId}/slots`);
      return res.data.data as AvailabilitySlot[];
    },
    enabled: !!doctorId,
  });
}

// ─── Update doctor profile ────────────────────────────────────────────────────

export function useUpdateDoctorProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateDoctorData;
    }) => {
      const res = await api.patch(`/doctors/${id}`, data);
      return res.data.data as Doctor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
}

// ─── Update doctor availability slots ────────────────────────────────────────

export function useUpdateDoctorSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      doctorId,
      slots,
    }: {
      doctorId: string;
      slots: SlotInput[];
    }) => {
      const res = await api.put(`/doctors/${doctorId}/slots`, { slots });
      return res.data.data as AvailabilitySlot[];
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['doctor', variables.doctorId, 'slots'],
      });
      queryClient.invalidateQueries({ queryKey: ['doctor', 'me'] });
    },
  });
}
