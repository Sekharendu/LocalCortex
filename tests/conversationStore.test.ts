import { describe, test, expect, afterAll } from "vitest";
import {
  createConversation,
  appendMessage,
  getConversation,
  listConversations,
  renameConversation,
  deleteConversation,
} from "../src/conversationStore.js";
import { pool } from "../src/db.js";
import { postgresUp } from "./helpers/stack.js";

// Live against the real Postgres (migrations applied). Every test creates its own
// conversations and removes them, so real chats are never touched.
const created: string[] = [];

afterAll(async () => {
  if (postgresUp) for (const id of created) await deleteConversation(id);
  await pool.end();
});

async function newConversation(title: string) {
  const c = await createConversation(title);
  created.push(c.id);
  return c;
}

describe("conversationStore", () => {
  test.skipIf(!postgresUp)("stores messages in order with citations and status", async () => {
    const c = await newConversation("store test");
    await appendMessage(c.id, { role: "user", content: "How many vacation days?" });
    await appendMessage(c.id, {
      role: "assistant",
      content: "15 days.",
      citations: [{ source: "eval-corpus.txt", page: 2 }],
    });
    await appendMessage(c.id, { role: "assistant", content: "partial", status: "interrupted" });

    const loaded = await getConversation(c.id);
    expect(loaded?.messages.map((m) => m.content)).toEqual(["How many vacation days?", "15 days.", "partial"]);
    expect(loaded?.messages[1].citations).toEqual([{ source: "eval-corpus.txt", page: 2 }]);
    expect(loaded?.messages[0].citations).toBeNull();
    expect(loaded?.messages[1].status).toBeNull();
    expect(loaded?.messages[2].status).toBe("interrupted");
  });

  test.skipIf(!postgresUp)("appending a message moves the chat to the top of the list", async () => {
    const older = await newConversation("older");
    const newer = await newConversation("newer");
    await appendMessage(older.id, { role: "user", content: "bump" });

    const ids = (await listConversations()).map((c) => c.id);
    expect(ids.indexOf(older.id)).toBeLessThan(ids.indexOf(newer.id));
  });

  test.skipIf(!postgresUp)("rename, and delete removes the chat and its messages", async () => {
    const c = await newConversation("before");
    await appendMessage(c.id, { role: "user", content: "hi" });

    expect((await renameConversation(c.id, "after"))?.title).toBe("after");
    expect(await deleteConversation(c.id)).toBe(true);
    expect(await getConversation(c.id)).toBeNull();
    const orphaned = await pool.query("SELECT count(*)::int AS n FROM messages WHERE conversation_id = $1", [c.id]);
    expect(orphaned.rows[0].n).toBe(0);
  });

  test.skipIf(!postgresUp)("unknown or malformed ids read as not found instead of throwing", async () => {
    expect(await getConversation("00000000-0000-0000-0000-000000000000")).toBeNull();
    expect(await getConversation("not-a-uuid")).toBeNull();
    expect(await renameConversation("not-a-uuid", "x")).toBeNull();
    expect(await deleteConversation("not-a-uuid")).toBe(false);
  });
});
