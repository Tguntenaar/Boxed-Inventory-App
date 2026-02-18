-- Enable RLS on all tables (Supabase may have it on by default, but explicit is clear)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_collaborators ENABLE ROW LEVEL SECURITY;

-- profiles: users can read/update their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- profiles INSERT is done by handle_new_user trigger (SECURITY DEFINER, bypasses RLS)

-- boxes: owners can CRUD; collaborators can read
CREATE POLICY "Users can read own boxes" ON boxes
  FOR SELECT USING (owner_profile_id = auth.uid());

CREATE POLICY "Users can read boxes they collaborate on" ON boxes
  FOR SELECT USING (
    id IN (SELECT box_id FROM box_collaborators WHERE collaborator_profile_id = auth.uid())
  );

CREATE POLICY "Users can create boxes they own" ON boxes
  FOR INSERT WITH CHECK (owner_profile_id = auth.uid());

CREATE POLICY "Users can update own boxes" ON boxes
  FOR UPDATE USING (owner_profile_id = auth.uid());

CREATE POLICY "Users can delete own boxes" ON boxes
  FOR DELETE USING (owner_profile_id = auth.uid());

-- items: CRUD if user has access to the box
CREATE POLICY "Users can read items in accessible boxes" ON items
  FOR SELECT USING (
    box_id IN (
      SELECT id FROM boxes WHERE owner_profile_id = auth.uid()
      UNION
      SELECT box_id FROM box_collaborators WHERE collaborator_profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items in accessible boxes" ON items
  FOR INSERT WITH CHECK (
    box_id IN (
      SELECT id FROM boxes WHERE owner_profile_id = auth.uid()
      UNION
      SELECT box_id FROM box_collaborators WHERE collaborator_profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in accessible boxes" ON items
  FOR UPDATE USING (
    box_id IN (
      SELECT id FROM boxes WHERE owner_profile_id = auth.uid()
      UNION
      SELECT box_id FROM box_collaborators WHERE collaborator_profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items in accessible boxes" ON items
  FOR DELETE USING (
    box_id IN (
      SELECT id FROM boxes WHERE owner_profile_id = auth.uid()
      UNION
      SELECT box_id FROM box_collaborators WHERE collaborator_profile_id = auth.uid()
    )
  );

-- item_types: authenticated users can read and create (shared catalog)
CREATE POLICY "Authenticated users can read item types" ON item_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create item types" ON item_types
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update item types" ON item_types
  FOR UPDATE TO authenticated USING (true);

-- box_collaborators: box owners can manage; collaborators can read
CREATE POLICY "Users can read collaborators on their boxes" ON box_collaborators
  FOR SELECT USING (
    box_id IN (SELECT id FROM boxes WHERE owner_profile_id = auth.uid())
    OR collaborator_profile_id = auth.uid()
  );

CREATE POLICY "Box owners can add collaborators" ON box_collaborators
  FOR INSERT WITH CHECK (
    box_id IN (SELECT id FROM boxes WHERE owner_profile_id = auth.uid())
  );

CREATE POLICY "Box owners can remove collaborators" ON box_collaborators
  FOR DELETE USING (
    box_id IN (SELECT id FROM boxes WHERE owner_profile_id = auth.uid())
  );

CREATE POLICY "Collaborators can remove themselves" ON box_collaborators
  FOR DELETE USING (collaborator_profile_id = auth.uid());
