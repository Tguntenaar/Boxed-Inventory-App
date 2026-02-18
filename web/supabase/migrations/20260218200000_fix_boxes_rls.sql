-- Fix boxes RLS: ensure INSERT/UPDATE/DELETE work for authenticated users.
-- Use TO authenticated explicitly (required for PostgREST with JWT).

-- Re-enable RLS (in case it was disabled for debugging)
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;

-- Drop existing boxes policies
DROP POLICY IF EXISTS "Users can read own boxes" ON boxes;
DROP POLICY IF EXISTS "Users can read boxes they collaborate on" ON boxes;
DROP POLICY IF EXISTS "Users can read accessible boxes" ON boxes;
DROP POLICY IF EXISTS "Users can create boxes they own" ON boxes;
DROP POLICY IF EXISTS "Users can update own boxes" ON boxes;
DROP POLICY IF EXISTS "Users can delete own boxes" ON boxes;

-- Ensure helper exists (idempotent)
CREATE OR REPLACE FUNCTION accessible_box_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM boxes WHERE owner_profile_id = auth.uid()
  UNION
  SELECT box_id FROM box_collaborators WHERE collaborator_profile_id = auth.uid();
$$;

-- SELECT: own + collaborator boxes (via helper)
CREATE POLICY "boxes_select_accessible"
ON boxes FOR SELECT TO authenticated
USING (id IN (SELECT accessible_box_ids()));

-- INSERT: only for own rows
CREATE POLICY "boxes_insert_own"
ON boxes FOR INSERT TO authenticated
WITH CHECK (owner_profile_id = auth.uid());

-- UPDATE: only own boxes
CREATE POLICY "boxes_update_own"
ON boxes FOR UPDATE TO authenticated
USING (owner_profile_id = auth.uid())
WITH CHECK (owner_profile_id = auth.uid());

-- DELETE: only own boxes
CREATE POLICY "boxes_delete_own"
ON boxes FOR DELETE TO authenticated
USING (owner_profile_id = auth.uid());
