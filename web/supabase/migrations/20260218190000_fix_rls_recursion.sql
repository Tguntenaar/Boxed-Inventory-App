-- Fix infinite recursion: policies that cross-reference boxes <-> box_collaborators
-- Use SECURITY DEFINER functions to bypass RLS when checking permissions

-- Helper: box IDs the user can access (owns or collaborates)
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

-- Helper: box IDs the user owns (for owner-only operations)
CREATE OR REPLACE FUNCTION owned_box_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM boxes WHERE owner_profile_id = auth.uid();
$$;

-- Drop recursive policies
DROP POLICY IF EXISTS "Users can read own boxes" ON boxes;
DROP POLICY IF EXISTS "Users can read boxes they collaborate on" ON boxes;
DROP POLICY IF EXISTS "Users can read items in accessible boxes" ON items;
DROP POLICY IF EXISTS "Users can insert items in accessible boxes" ON items;
DROP POLICY IF EXISTS "Users can update items in accessible boxes" ON items;
DROP POLICY IF EXISTS "Users can delete items in accessible boxes" ON items;
DROP POLICY IF EXISTS "Users can read collaborators on their boxes" ON box_collaborators;
DROP POLICY IF EXISTS "Box owners can add collaborators" ON box_collaborators;
DROP POLICY IF EXISTS "Box owners can remove collaborators" ON box_collaborators;

-- boxes: single SELECT policy using helper (no cross-table recursion)
CREATE POLICY "Users can read accessible boxes" ON boxes
  FOR SELECT USING (id IN (SELECT accessible_box_ids()));

-- items: use helper
CREATE POLICY "Users can read items in accessible boxes" ON items
  FOR SELECT USING (box_id IN (SELECT accessible_box_ids()));

CREATE POLICY "Users can insert items in accessible boxes" ON items
  FOR INSERT WITH CHECK (box_id IN (SELECT accessible_box_ids()));

CREATE POLICY "Users can update items in accessible boxes" ON items
  FOR UPDATE USING (box_id IN (SELECT accessible_box_ids()));

CREATE POLICY "Users can delete items in accessible boxes" ON items
  FOR DELETE USING (box_id IN (SELECT accessible_box_ids()));

-- box_collaborators: use helpers
CREATE POLICY "Users can read collaborators on accessible boxes" ON box_collaborators
  FOR SELECT USING (box_id IN (SELECT accessible_box_ids()));

CREATE POLICY "Box owners can add collaborators" ON box_collaborators
  FOR INSERT WITH CHECK (box_id IN (SELECT owned_box_ids()));

CREATE POLICY "Box owners can remove collaborators" ON box_collaborators
  FOR DELETE USING (box_id IN (SELECT owned_box_ids()));
