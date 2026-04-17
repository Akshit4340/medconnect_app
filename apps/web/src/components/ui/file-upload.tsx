'use client';

import { useCallback, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFileUpload } from '@/hooks/use-files';

interface FileUploadProps {
  category?: 'medical-document' | 'lab-report' | 'imaging' | 'other';
  appointmentId?: string;
  onUploadComplete?: (file: {
    key: string;
    url: string;
    originalName: string;
  }) => void;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUpload({
  category = 'other',
  appointmentId,
  onUploadComplete,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif',
  maxSizeMB = 10,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useFileUpload();

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxSizeBytes) {
        return `File size exceeds ${maxSizeMB}MB limit`;
      }
      return null;
    },
    [maxSizeBytes, maxSizeMB],
  );

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setSelectedFile(file);
    },
    [validateFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    uploadMutation.mutate(
      { file: selectedFile, category, appointmentId },
      {
        onSuccess: (data) => {
          setSelectedFile(null);
          if (inputRef.current) inputRef.current.value = '';
          onUploadComplete?.({
            key: data.key,
            url: data.url,
            originalName: data.originalName,
          });
        },
        onError: (err) => {
          setError(err.message || 'Upload failed');
        },
      },
    );
  }, [selectedFile, uploadMutation, category, appointmentId, onUploadComplete]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="p-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
        `}
      >
        <div className="text-3xl mb-2">📁</div>
        <p className="text-sm text-slate-600">
          Drag & drop a file here, or{' '}
          <span className="text-blue-600 font-medium">browse</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Max file size: {maxSizeMB}MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {selectedFile && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-slate-500">
              {formatSize(selectedFile.size)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedFile(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      )}

      {uploadMutation.isSuccess && (
        <p className="mt-2 text-xs text-green-600">
          ✅ File uploaded successfully
        </p>
      )}
    </Card>
  );
}
