import { useRef, useState } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  hint?: string;
  value: string | null;
  bucketPath: string;
  accept?: string;
  onChange: (url: string | null) => void;
}

export const ImageUpload: React.FC<Props> = ({
  label,
  hint,
  value,
  bucketPath,
  accept = 'image/png,image/jpeg,image/webp',
  onChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 5 MB)');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${bucketPath}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('examens-assets')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('examens-assets').getPublicUrl(path);
      onChange(`${data.publicUrl}?t=${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    try {
      const url = new URL(value);
      const segments = url.pathname.split('/examens-assets/');
      if (segments[1]) {
        const cleanPath = segments[1].split('?')[0];
        await supabase.storage.from('examens-assets').remove([cleanPath]);
      }
    } catch {
      // Suppression best-effort — on réinitialise quoi qu'il arrive
    }
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-primary">{label}</label>
      {hint && <p className="text-xs text-muted">{hint}</p>}

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            className="h-20 w-auto max-w-[200px] rounded-md border border-border object-contain bg-surface p-1"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center hover:bg-danger/80 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'flex flex-col items-center justify-center w-40 h-20 border-2 border-dashed rounded-md transition-colors',
            'border-border hover:border-brand-primary hover:bg-brand-primary/5',
            uploading && 'opacity-50 cursor-not-allowed',
          )}
        >
          {uploading ? (
            <span className="text-xs text-muted animate-pulse">Upload...</span>
          ) : (
            <>
              <ImageIcon size={20} className="text-muted mb-1" />
              <span className="text-xs text-muted flex items-center gap-1">
                <Upload size={10} /> Choisir
              </span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};
