-- Colonnes logo_url et signature_url dans examens
ALTER TABLE examens
  ADD COLUMN IF NOT EXISTS logo_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS signature_url TEXT NULL;

-- Bucket Supabase Storage public pour les assets d'examens
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'examens-assets',
  'examens-assets',
  true,
  5242880, -- 5 MB max
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Storage : lecture publique
CREATE POLICY "Public read examens-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'examens-assets');

-- RLS Storage : upload par utilisateurs authentifiés
-- (contrôle admin fait côté application via RoleGuard)
CREATE POLICY "Authenticated upload examens-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'examens-assets' AND auth.role() = 'authenticated');

-- RLS Storage : update/delete par utilisateurs authentifiés
CREATE POLICY "Authenticated update examens-assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'examens-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete examens-assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'examens-assets' AND auth.role() = 'authenticated');
