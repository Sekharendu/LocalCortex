-- Spaces: a Space holds files and chats; a chat only searches its Space's files.
CREATE TABLE spaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  -- The "General" Space that pre-Space data and the legacy routes use. At most one.
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX spaces_one_default_idx ON spaces ((true)) WHERE is_default;

-- Existing chats move into General. A fresh database gets no General Space here; the
-- server creates it on demand (files from before Spaces, or a legacy route).
INSERT INTO spaces (name, is_default)
SELECT 'General', true WHERE EXISTS (SELECT 1 FROM conversations);

ALTER TABLE conversations ADD COLUMN space_id uuid REFERENCES spaces (id) ON DELETE CASCADE;
UPDATE conversations SET space_id = (SELECT id FROM spaces WHERE is_default);
ALTER TABLE conversations ALTER COLUMN space_id SET NOT NULL;
CREATE INDEX conversations_space_updated_idx ON conversations (space_id, updated_at DESC);

-- Which answer model wrote an assistant message (null: user messages and older answers).
ALTER TABLE messages ADD COLUMN model text;
