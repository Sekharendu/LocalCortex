import type { ConversationSummary } from "../types";

export interface ChatGroup {
  label: string;
  chats: ConversationSummary[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Buckets chats (already newest first) into Today / Previous 7 days / Older by last activity. */
export function groupByRecency(chats: ConversationSummary[], now = new Date()): ChatGroup[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = startOfToday - 7 * DAY_MS;
  const groups: ChatGroup[] = [
    { label: "Today", chats: [] },
    { label: "Previous 7 days", chats: [] },
    { label: "Older", chats: [] },
  ];
  for (const chat of chats) {
    const t = new Date(chat.updatedAt).getTime();
    groups[t >= startOfToday ? 0 : t >= weekAgo ? 1 : 2].chats.push(chat);
  }
  return groups.filter((g) => g.chats.length > 0);
}
