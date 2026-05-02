'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Upload, X, Loader2 } from 'lucide-react';

interface CatalogLogoUploadProps {
  onUpload: (url: string) => void;
  onRemove: () => void;
  logoUrl: string | null;
  appId?: string;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_SIZE = 1 * 1024 * 1024; // 1MB

export default function CatalogLogoUpload({ onUpload, onRemove, logoUrl, appId }: CatalogLogoUploadProps) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback(async (file: File) => {
    setError('');

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only PNG, SVG, and JPG files are accepted.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('File must be under 1MB.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (appId) formData.append('appId', appId);

      const res = await fetch('/api/admin/upload-catalog-logo', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const { url } = await res.json();
      onUpload(url);
    } catch {
      setError('Failed to upload. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [appId, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (logoUrl) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-24 w-24 overflow-hidden rounded-xl bg-slate-50 border border-slate-200 p-2 shadow-sm">
          <img
            src={logoUrl}
            alt="Platform logo"
            className="h-full w-full object-contain"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            onRemove();
            setError('');
          }}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors font-medium"
        >
          <X size={12} strokeWidth={2} />
          Remove Logo
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition-all duration-200 ${
          isDragging
            ? 'border-sky/50 bg-sky/5'
            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.svg,.jpg,.jpeg"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Upload logo"
        />

        {isUploading ? (
          <>
            <Loader2 size={24} strokeWidth={2} className="animate-spin text-sky" />
            <span className="text-xs text-slate-500 font-medium">
              Uploading...
            </span>
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky/10">
              <Upload size={18} strokeWidth={2} className="text-sky" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-slate-600">
                Drag & drop logo
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400 font-medium">
                or click to browse
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-500 font-medium text-center">{error}</p>
      )}
    </div>
  );
}
