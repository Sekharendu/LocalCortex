import { useCallback, useEffect, useState } from "react";

// Two routes only: "/" (new chat) and "/c/:id". The history API covers that without a
// router library, and reloading keeps you in the same chat.

export function conversationIdFrom(path: string): string | null {
  const m = /^\/c\/([^/]+)\/?$/.exec(path);
  return m ? decodeURIComponent(m[1]) : null;
}

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

  return { path, conversationId: conversationIdFrom(path), navigate };
}
