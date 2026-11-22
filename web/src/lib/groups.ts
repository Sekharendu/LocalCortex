import type { ConversationSummary } from "../types";

export interface ChatGroup {
  label: string;
  chats: ConversationSummary[];
}

/** How a Space lists its chats (the sidebar's filter menu). */
export interface ChatListView {
  sort: "updated" | "created";
  group: "date" | "flat";
}

export const DEFAULT_VIEW: ChatListView = { sort: "updated", group: "date" };

const DAY_MS = 24 * 60 * 60 * 1000;

const timeOf = (chat: ConversationSummary, sort: ChatListView["sort"]) =>
  new Date(sort === "created" ? chat.createdAt : chat.updatedAt).getTime();

/** Newest first by last activity or by creation. */
export function sortChats(chats: ConversationSummary[], sort: ChatListView["sort"]): ConversationSummary[] {
  return [...chats].sort((a, b) => timeOf(b, sort) - timeOf(a, sort));
}

/** Buckets chats (already newest first) into Today / Previous 7 days / Older. */
export function groupByRecency(
  chats: ConversationSummary[],
  now = new Date(),
  sort: ChatListView["sort"] = "updated",
): ChatGroup[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = startOfToday - 7 * DAY_MS;
  const groups: ChatGroup[] = [
    { label: "Today", chats: [] },
    { label: "Previous 7 days", chats: [] },
    { label: "Older", chats: [] },
  ];
  for (const chat of chats) {
    const t = timeOf(chat, sort);
    groups[t >= startOfToday ? 0 : t >= weekAgo ? 1 : 2].chats.push(chat);
  }
  return groups.filter((g) => g.chats.length > 0);
}

/** The chats of one Space as the view asks: sorted, then grouped by date or one flat list. */
export function arrangeChats(chats: ConversationSummary[], view: ChatListView, now = new Date()): ChatGroup[] {
  const sorted = sortChats(chats, view.sort);
  if (view.group === "flat") return sorted.length ? [{ label: "", chats: sorted }] : [];
  return groupByRecency(sorted, now, view.sort);
}
