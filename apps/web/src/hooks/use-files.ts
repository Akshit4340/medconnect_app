import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  key: string;
  url: string;
  originalName: string;
  contentType: string;
  size: number;
}

interface PresignedUrlResponse {
  presignedUrl: string;
  key: string;
  fileUrl: string;
}

// ─── Upload file via multipart form ──────────────────────────────────────────

export function useFileUpload() {
  const queryClient = useQueryClient();

  return useMutation<
    UploadedFile,
    Error,
    { file: File; category?: string; appointmentId?: string }
  >({
    mutationFn: async ({ file, category, appointmentId }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (category) formData.append('category', category);
      if (appointmentId) formData.append('appointmentId', appointmentId);

      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as UploadedFile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

// ─── Get presigned upload URL ────────────────────────────────────────────────

export function usePresignedUrl() {
  return useMutation<
    PresignedUrlResponse,
    Error,
    { fileName: string; contentType: string; category?: string }
  >({
    mutationFn: async ({ fileName, contentType, category }) => {
      const res = await api.post('/files/presigned-url', {
        fileName,
        contentType,
        category,
      });
      return res.data.data as PresignedUrlResponse;
    },
  });
}

// ─── Get file download URL ───────────────────────────────────────────────────

export function useFileDownloadUrl(key: string) {
  return useQuery<string>({
    queryKey: ['files', 'download', key],
    queryFn: async () => {
      const res = await api.get(`/files/download/${key}`);
      return res.data.data.url as string;
    },
    enabled: !!key,
  });
}
