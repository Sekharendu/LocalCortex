CREATE TABLE conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX conversations_updated_at_idx ON conversations (updated_at DESC);

CREATE TABLE messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  role             text NOT NULL CHECK (role IN ('user', 'assistant')),
  content          text NOT NULL,
  -- [{ "source": "...", "page": 3 }] for assistant replies; null for user messages
  citations        jsonb,
  -- null = complete; 'interrupted' = client disconnected mid-answer; 'error' = generation failed
  status           text CHECK (status IN ('interrupted', 'error')),
  created_at       timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX messages_conversation_created_idx ON messages (conversation_id, created_at);
