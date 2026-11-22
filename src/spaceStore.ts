import { pool, withTransaction } from "./db.js";
import type pg from "pg";

export interface Space {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (id: string) => UUID_RE.test(id);

export const DEFAULT_SPACE_NAME = "General";

interface SpaceRow {
  id: string;
  name: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = "id, name, is_default, created_at, updated_at";

function toSpace(r: SpaceRow): Space {
  return { id: r.id, name: r.name, isDefault: r.is_default, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString() };
}

export async function createSpace(name: string): Promise<Space> {
  const { rows } = await pool.query<SpaceRow>(`INSERT INTO spaces (name) VALUES ($1) RETURNING ${COLUMNS}`, [name]);
  return toSpace(rows[0]);
}

/** Most recently active first: a Space's activity is its own edits or its latest chat. */
export async function listSpaces(): Promise<(Space & { chatCount: number })[]> {
  const { rows } = await pool.query<SpaceRow & { chat_count: string; active_at: Date }>(
    `SELECT s.id, s.name, s.is_default, s.created_at, s.updated_at,
            count(c.id) AS chat_count, greatest(s.updated_at, max(c.updated_at)) AS active_at
       FROM spaces s LEFT JOIN conversations c ON c.space_id = s.id
      GROUP BY s.id
      ORDER BY active_at DESC, s.created_at DESC`,
  );
  return rows.map((r) => ({ ...toSpace(r), chatCount: Number(r.chat_count) }));
}

export async function getSpace(id: string): Promise<Space | null> {
  if (!isUuid(id)) return null;
  const { rows } = await pool.query<SpaceRow>(`SELECT ${COLUMNS} FROM spaces WHERE id = $1`, [id]);
  return rows.length ? toSpace(rows[0]) : null;
}

export async function renameSpace(id: string, name: string): Promise<Space | null> {
  if (!isUuid(id)) return null;
  const { rows } = await pool.query<SpaceRow>(
    `UPDATE spaces SET name = $2, updated_at = now() WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, name],
  );
  return rows.length ? toSpace(rows[0]) : null;
}

export async function countChats(spaceId: string): Promise<number> {
  if (!isUuid(spaceId)) return 0;
  const { rows } = await pool.query<{ n: string }>("SELECT count(*) AS n FROM conversations WHERE space_id = $1", [spaceId]);
  return Number(rows[0].n);
}

/**
 * Deletes the Space and (cascade) its chats inside one transaction, and runs `alsoDelete`
 * (the files and chunks) before committing. If `alsoDelete` throws, the transaction rolls
 * back, so the Space and its chats are kept. Returns false when the Space doesn't exist.
 */
export async function deleteSpace(id: string, alsoDelete: (client: pg.PoolClient) => Promise<void>): Promise<boolean> {
  if (!isUuid(id)) return false;
  return withTransaction(async (client) => {
    // Locks the row, so two deletes of one Space can't both run the file/chunk cleanup.
    const { rowCount } = await client.query("DELETE FROM spaces WHERE id = $1", [id]);
    if (!rowCount) return false;
    await alsoDelete(client);
    return true;
  });
}

/** The General Space, created on first need. Concurrent callers get the same row. */
export async function getOrCreateDefaultSpace(): Promise<Space> {
  const found = await pool.query<SpaceRow>(`SELECT ${COLUMNS} FROM spaces WHERE is_default`);
  if (found.rows.length) return toSpace(found.rows[0]);
  await pool.query("INSERT INTO spaces (name, is_default) VALUES ($1, true) ON CONFLICT DO NOTHING", [DEFAULT_SPACE_NAME]);
  const { rows } = await pool.query<SpaceRow>(`SELECT ${COLUMNS} FROM spaces WHERE is_default`);
  return toSpace(rows[0]);
}

/** Marks the Space active (sidebar order) without changing its name. */
export async function touchSpace(id: string): Promise<void> {
  if (!isUuid(id)) return;
  await pool.query("UPDATE spaces SET updated_at = now() WHERE id = $1", [id]);
}
