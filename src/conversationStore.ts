import { pool, withTransaction } from "./db.js";
import type { Citation } from "./types.js";

export type MessageRole = "user" | "assistant";
export type MessageStatus = "interrupted" | "error";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  citations: Citation[] | null;
  /** null = complete */
  status: MessageStatus | null;
  /** Answer model key for assistant messages (null for user messages and older answers). */
  model: string | null;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  spaceId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation extends ConversationSummary {
  messages: Message[];
}

// An id that isn't a UUID can't exist; answering "not found" avoids a Postgres
// "invalid input syntax for type uuid" error turning a bad URL into a 500.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ConversationRow {
  id: string;
  space_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

interface MessageRow {
  id: string;
  role: MessageRole;
  content: string;
  citations: Citation[] | null;
  status: MessageStatus | null;
  model: string | null;
  created_at: Date;
}

function toSummary(r: ConversationRow): ConversationSummary {
  return { id: r.id, spaceId: r.space_id, title: r.title, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString() };
}

function toMessage(r: MessageRow): Message {
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    citations: r.citations,
    status: r.status,
    model: r.model,
    createdAt: r.created_at.toISOString(),
  };
}

const CONV_COLUMNS = "id, space_id, title, created_at, updated_at";

export async function createConversation(title: string, spaceId: string): Promise<ConversationSummary> {
  const { rows } = await pool.query<ConversationRow>(
    `INSERT INTO conversations (title, space_id) VALUES ($1, $2) RETURNING ${CONV_COLUMNS}`,
    [title, spaceId],
  );
  return toSummary(rows[0]);
}

/** Most recently active first; only one Space's chats when `spaceId` is given. */
export async function listConversations(spaceId?: string): Promise<ConversationSummary[]> {
  if (spaceId !== undefined && !UUID_RE.test(spaceId)) return [];
  const { rows } = spaceId === undefined
    ? await pool.query<ConversationRow>(`SELECT ${CONV_COLUMNS} FROM conversations ORDER BY updated_at DESC`)
    : await pool.query<ConversationRow>(
        `SELECT ${CONV_COLUMNS} FROM conversations WHERE space_id = $1 ORDER BY updated_at DESC`,
        [spaceId],
      );
  return rows.map(toSummary);
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (!UUID_RE.test(id)) return null;
  const conv = await pool.query<ConversationRow>(
    `SELECT ${CONV_COLUMNS} FROM conversations WHERE id = $1`,
    [id],
  );
  if (conv.rows.length === 0) return null;
  const msgs = await pool.query<MessageRow>(
    "SELECT id, role, content, citations, status, model, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at, id",
    [id],
  );
  return { ...toSummary(conv.rows[0]), messages: msgs.rows.map(toMessage) };
}

/** Appends a message and bumps the conversation's updated_at in one transaction. */
export async function appendMessage(
  conversationId: string,
  message: { role: MessageRole; content: string; citations?: Citation[] | null; status?: MessageStatus | null; model?: string | null },
): Promise<Message> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<MessageRow>(
      `INSERT INTO messages (conversation_id, role, content, citations, status, model)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, role, content, citations, status, model, created_at`,
      [
        conversationId,
        message.role,
        message.content,
        message.citations ? JSON.stringify(message.citations) : null,
        message.status ?? null,
        message.model ?? null,
      ],
    );
    await client.query("UPDATE conversations SET updated_at = now() WHERE id = $1", [conversationId]);
    return toMessage(rows[0]);
  });
}

export async function renameConversation(id: string, title: string): Promise<ConversationSummary | null> {
  if (!UUID_RE.test(id)) return null;
  const { rows } = await pool.query<ConversationRow>(
    `UPDATE conversations SET title = $2, updated_at = now() WHERE id = $1 RETURNING ${CONV_COLUMNS}`,
    [id, title],
  );
  return rows.length ? toSummary(rows[0]) : null;
}

/** Deletes the conversation and (via ON DELETE CASCADE) its messages. */
export async function deleteConversation(id: string): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  const { rowCount } = await pool.query("DELETE FROM conversations WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}
