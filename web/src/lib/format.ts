import type { Citation } from "../types.js";

// The server reports a failure after streaming has started as a trailing footer, since
// the status code is already sent. Split it off so it shows as an error, not answer text.
const FOOTER_RE = /\n\n\[generation error: ([\s\S]*)\]$/;
const FOOTER_START = "\n\n[generation error: ";

/** Hold a possible error footer until EOF, including a marker split across reads. */
export function streamingAnswerText(text: string): string {
  const footer = text.lastIndexOf(FOOTER_START);
  if (footer !== -1) return text.slice(0, footer);
  for (let length = FOOTER_START.length - 1; length > 0; length--) {
    if (text.endsWith(FOOTER_START.slice(0, length))) return text.slice(0, -length);
  }
  return text;
}

export function splitErrorFooter(text: string): { text: string; error: string | null } {
  const m = FOOTER_RE.exec(text);
  return m ? { text: text.slice(0, m.index), error: m[1] } : { text, error: null };
}

export function citationLabel(c: Citation): string {
  const name = c.source.split(/[\\/]/).pop() || c.source;
  return c.page !== undefined ? `${name} · p.${c.page}` : name;
}
