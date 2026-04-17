import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SoapNote {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateSoapNoteData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

// ─── Get SOAP note for appointment ──────────────────────────────────────────

export function useSoapNote(appointmentId: string) {
  return useQuery<SoapNote>({
    queryKey: ['medical', 'soap', appointmentId],
    queryFn: async () => {
      const res = await api.get(`/medical/${appointmentId}/consultation-note`);
      return res.data.data as SoapNote;
    },
    enabled: !!appointmentId,
    retry: false,
  });
}

// ─── Create SOAP note ───────────────────────────────────────────────────────

export function useCreateSoapNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      data,
    }: {
      appointmentId: string;
      data: CreateSoapNoteData;
    }) => {
      const res = await api.post(
        `/medical/${appointmentId}/consultation-note`,
        data,
      );
      return res.data.data as SoapNote;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['medical', 'soap', variables.appointmentId],
      });
    },
  });
}

// ─── Search medical records ─────────────────────────────────────────────────

export function useMedicalRecords(patientId: string) {
  return useQuery<SoapNote[]>({
    queryKey: ['medical', 'records', patientId],
    queryFn: async () => {
      const res = await api.get(`/medical/search?patientId=${patientId}`);
      return res.data.data as SoapNote[];
    },
    enabled: !!patientId,
  });
}

// ─── Generate prescription PDF ──────────────────────────────────────────────

export function useGeneratePrescription() {
  return useMutation({
    mutationFn: async ({
      appointmentId,
      data,
    }: {
      appointmentId: string;
      data: {
        doctorId: string;
        patientId: string;
        medications: Array<{
          name: string;
          dosage: string;
          frequency: string;
          duration: string;
        }>;
        instructions?: string;
      };
    }) => {
      const res = await api.post(
        `/medical/${appointmentId}/prescription`,
        data,
        { responseType: 'blob' },
      );
      return res.data;
    },
  });
}

// ─── Toggle note visibility ─────────────────────────────────────────────────

export function useToggleNoteVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      isVisible,
    }: {
      appointmentId: string;
      isVisible: boolean;
    }) => {
      const res = await api.patch(
        `/medical/${appointmentId}/consultation-note/visibility`,
        { isVisible },
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['medical', 'soap', variables.appointmentId],
      });
    },
  });
}
