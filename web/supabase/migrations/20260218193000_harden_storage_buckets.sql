-- Harden storage buckets used by the app.
-- - Keep buckets public for image display via public URLs
-- - Restrict allowed MIME types
-- - Enforce file size limits
-- - Restrict write operations to authenticated owners

-- Ensure buckets exist and enforce config.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'item-photos',
    'item-photos',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'box-photos',
    'box-photos',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- NOTE:
-- On hosted Supabase, migration roles often do not own storage.objects.
-- That means ALTER TABLE / CREATE POLICY / DROP POLICY on storage.objects
-- can fail with SQLSTATE 42501. Keep this migration limited to bucket config.
--
-- Configure storage policies in the Dashboard:
-- Storage -> Policies (table: storage.objects), for buckets:
--   avatars, item-photos, box-photos
-- Recommended policies:
--   - Public SELECT
--   - Authenticated INSERT with owner = auth.uid()
--   - Owner-only UPDATE/DELETE
