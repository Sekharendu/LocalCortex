import type { Citation } from "../types";

// The server reports a failure after streaming has started as a trailing footer, since
// the status code is already sent. Split it off so it shows as an error, not answer text.
const FOOTER_RE = /\n\n\[generation error: ([\s\S]*)\]$/;

export function splitErrorFooter(text: string): { text: string; error: string | null } {
  const m = FOOTER_RE.exec(text);
  return m ? { text: text.slice(0, m.index), error: m[1] } : { text, error: null };
}

export function citationLabel(c: Citation): string {
  const name = c.source.split(/[\\/]/).pop() || c.source;
  return c.page !== undefined ? `${name} · p.${c.page}` : name;
}
