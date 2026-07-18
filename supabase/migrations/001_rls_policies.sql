-- Supabase RLS policies for notes
-- Run in Supabase SQL editor

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved notes"
  ON notes FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Anyone can submit pending notes"
  ON notes FOR INSERT
  WITH CHECK (status = 'pending');

CREATE POLICY "Service role manages notes"
  ON notes FOR ALL
  USING (auth.role() = 'service_role');
