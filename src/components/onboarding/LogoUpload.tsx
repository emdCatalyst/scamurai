'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface LogoUploadProps {
  onUpload: (url: string) => void;
  onRemove: () => void;
  logoUrl: string | null;
  brandId: string;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export default function LogoUpload({ onUpload, onRemove, logoUrl, brandId }: LogoUploadProps) {
  const t = useTranslations('onboarding');
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
      setError('File must be under 2MB.');
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Supabase Storage via API route
      const formData = new FormData();
      formData.append('file', file);
      formData.append('brandId', brandId);

      const res = await fetch('/api/upload-logo', {
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
  }, [brandId, onUpload]);

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
        <div className="relative h-28 w-28 overflow-hidden rounded-2xl bg-offwhite/10 p-2">
          <img
            src={logoUrl}
            alt="Brand logo"
            className="h-full w-full object-contain"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            onRemove();
            setError('');
          }}
          className="flex items-center gap-1.5 text-xs text-white/40 transition-colors hover:text-red-400"
        >
          <X size={12} strokeWidth={1.5} />
          {t('logoRemove')}
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
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-all duration-200 ${
          isDragging
            ? 'border-sky/50 bg-sky/5'
            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
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
            <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-sky" />
            <span className={`text-sm text-white/50 ${isAr ? 'font-arabic' : ''}`}>
              {t('logoUploading')}
            </span>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky/10">
              <Upload size={20} strokeWidth={1.5} className="text-sky" />
            </div>
            <div className="text-center">
              <p className={`text-sm font-medium text-white/70 ${isAr ? 'font-arabic' : ''}`}>
                {t('logoDragDrop')}
              </p>
              <p className={`mt-1 text-xs text-white/30 ${isAr ? 'font-arabic' : ''}`}>
                {t('logoOrBrowse')}
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
