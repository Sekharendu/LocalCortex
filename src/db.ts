import pg from "pg";

// Port 5433, matching docker-compose: 5432 is often taken by other local Postgres
// instances, and pointing at the wrong one would write into someone else's database.
export const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://localcortex:localcortex@localhost:5433/localcortex";

// connectionTimeoutMillis: without it a down/unreachable database makes queries (and
// /health) wait indefinitely instead of failing fast.
export const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10, connectionTimeoutMillis: 3000 });

/** Runs `work` inside a transaction on one pooled client, rolling back on any error. */
export async function withTransaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function postgresReachable(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
