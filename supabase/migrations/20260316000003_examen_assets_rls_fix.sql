-- ==============================================================================
-- Migration 20260316000003 — Hotfix : RLS Storage examens-assets
-- ==============================================================================
-- Les policies de la migration précédente autorisaient tout utilisateur
-- authentifié (chef_centre, chef_etablissement, tutelle inclus) à upload,
-- modifier et supprimer les assets. Seuls les admins doivent pouvoir écrire.
--
-- Corrections :
--   1. Restreindre INSERT/UPDATE/DELETE au rôle admin (via profiles.role)
--   2. Retirer image/svg+xml des MIME types autorisés (surface d'attaque inutile)
-- ==============================================================================

-- ── Retirer SVG des types autorisés ──────────────────────────────────────────

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'examens-assets';

-- ── Remplacer les policies d'écriture trop larges ────────────────────────────

DROP POLICY IF EXISTS "Authenticated upload examens-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update examens-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete examens-assets" ON storage.objects;

-- Upload réservé aux admins
CREATE POLICY "Admin upload examens-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'examens-assets'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );

-- Mise à jour réservée aux admins
CREATE POLICY "Admin update examens-assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'examens-assets'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );

-- Suppression réservée aux admins
CREATE POLICY "Admin delete examens-assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'examens-assets'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );
