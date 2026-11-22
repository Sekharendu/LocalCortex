import { useCallback, useEffect, useState } from "react";

// Routes: "/" (pick or create a Space), "/s/:spaceId" (new chat in a Space),
// "/s/:spaceId/c/:chatId" (a chat), and the older "/c/:chatId", which is redirected
// once the chat's Space is known. The history API covers that without a router library.

export interface Route {
  spaceId: string | null;
  conversationId: string | null;
}

export function parseRoute(path: string): Route {
  const chat = /^\/s\/([^/]+)\/c\/([^/]+)\/?$/.exec(path);
  if (chat) return { spaceId: decodeURIComponent(chat[1]), conversationId: decodeURIComponent(chat[2]) };
  const space = /^\/s\/([^/]+)\/?$/.exec(path);
  if (space) return { spaceId: decodeURIComponent(space[1]), conversationId: null };
  const legacy = /^\/c\/([^/]+)\/?$/.exec(path);
  if (legacy) return { spaceId: null, conversationId: decodeURIComponent(legacy[1]) };
  return { spaceId: null, conversationId: null };
}

export const spacePath = (spaceId: string) => `/s/${encodeURIComponent(spaceId)}`;
export const chatPath = (spaceId: string, chatId: string) => `${spacePath(spaceId)}/c/${encodeURIComponent(chatId)}`;

export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string, { replace = false } = {}) => {
    if (to === window.location.pathname) return;
    if (replace) window.history.replaceState(null, "", to);
    else window.history.pushState(null, "", to);
    setPath(to);
  }, []);

  return { path, ...parseRoute(path), navigate };
}
