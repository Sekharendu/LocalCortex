import { documentHeaders } from "./vectorStore.js";
import { needsRewrite } from "../generation/rewrite.js";
import type { ChunkPayload } from "../types.js";

export interface DocumentScope {
  status: "unrestricted" | "resolved" | "missing" | "ambiguous";
  references: string[];
  /** Undefined alone means unrestricted. Empty means explicitly unavailable. */
  documentIds?: string[];
}

export function normalizeIdentity(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/-\s*\n\s*/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

/** Deliberately literal grammar: filenames; quoted titles following paper/document/
 * report/bulletin/title; capitalized named documents ending in a document noun.
 * A version/date is identity only when attached to such an explicit reference.
 * Generic model versions and ordinary topic questions are not document selectors. */
export function explicitReferences(question: string): string[] {
  const refs: string[] = [];
  for (const m of question.matchAll(/\b(?:paper|document|report|bulletin|title|file)(?:\s+(?:called|named|titled))?\s+["“]([\s\S]+?)["”](?=$|[\s:;,?.)])/gi)) refs.push(m[1]!);
  for (const m of question.matchAll(/["“]([^"”]+\.(?:pdf|docx|md|txt))["”]/gi)) refs.push(m[1]!);
  for (const m of question.matchAll(/(?:^|[\s"“'(])([^\s"”'()<>]+\.(?:pdf|docx|md|txt))\b/gi)) {
    if (!refs.some(ref => ref.endsWith(m[1]!))) refs.push(m[1]!);
  }
  if (!refs.length) {
    for (const m of question.matchAll(/\b(?:in|from|regarding|using|about|the)\s+((?:[A-Z][\p{L}\p{N}'’-]*\s+){1,8}(?:Bulletin|Handbook|Policy|Report|Document|Paper|Manual))(?!\p{L})/gu)) refs.push(m[1]!);
  }
  return [...new Set(refs)];
}

/** Choose original user text before any LLM rewrite. A standalone question ends
 * inheritance; a new explicit reference replaces the old constraint. */
export function scopeQuestion(question: string, earlierUserQuestions: string[] = []): string {
  // Only a direct revision request binds to the inherited document. "And what
  // about model version 2?" remains topic text, not a document revision selector.
  const directQualifier = /^\s*(?:(?:and|also)\s+)?(?:(?:what\s+(?:does|about)|how\s+about|use|using|in|for)\s+)?(?:the\s+)?(?:version|revision|rev\.?|v|effective(?:\s+date)?)\s*[:=]?\s*\d/i.test(question);
  if (explicitReferences(question).length || (!needsRewrite(question) && !directQualifier)) return question;
  const pendingQualifiers = followupVersions(question);
  for (let i = earlierUserQuestions.length - 1; i >= 0; i--) {
    const previous = earlierUserQuestions[i]!;
    const references = explicitReferences(previous);
    if (references.length) {
      if (!pendingQualifiers.length) return `${previous}\n${question}`;
      // Preserve inherited constraints. A changed revision/date conflicts and fails
      // closed; the user can explicitly name the new identity to replace it.
      return references.map(ref => {
        const tokens = [...referenceVersions(previous, ref), ...pendingQualifiers];
        return `document "${ref}" ${tokens.map(t => t.replace("version:", "version ").replace("date:", "effective ")).join(" ")}:`;
      }).join("\n");
    }
    if (!needsRewrite(previous)) break;
    pendingQualifiers.push(...followupVersions(previous));
  }
  return question;
}

function followupVersions(question: string): string[] {
  // A referring revision may occur anywhere in the turn, including "does that
  // change in version 2?". Explicit model-version topics remain question content.
  const withoutModelVersions = question.replace(/\b(?:model|BERT|GPT(?:-[\d.]+)?|Llama|Qwen)\s+(?:version|revision|v)\s*\d+(?:\.\d+)*/gi, "")
    .replace(/\b(?:version|revision|v)\s*\d+(?:\.\d+)*\s+of\s+(?:the\s+)?model\b/gi, "");
  return versionTokens(withoutModelVersions);
}

function versionTokens(text: string): string[] {
  return [...text.matchAll(/\b(?:version|revision|rev\.?|v)\s*[:=]?\s*(\d+(?:\.\d+)*)\b|\b(?:effective(?:\s+date)?\s*[:=]?\s*)(\d{4}-\d{2}-\d{2})\b/gi)]
    .map(m => m[2] ? `date:${m[2]}` : `version:${m[1]}`);
}

function referenceVersions(question: string, ref: string): string[] {
  const index = question.indexOf(ref);
  const suffix = question.slice(index + ref.length).replace(/^["”]/, "");
  const attachment = suffix.match(/^\s*(?:(?:[,;(]\s*)?(?:version|revision|rev\.?|v|effective(?:\s+date)?)\s*[:=]?\s*\d[\d.\-]*\)?\s*)*/i)?.[0] ?? "";
  return versionTokens(ref + " " + attachment);
}

/** Complete leading title lines only. Text under another title cannot supply an
 * identity, even if it mentions the requested document in its first sentence. */
function leadingTitleEnd(text: string, needle: string): number | undefined {
  const lines = text.trimStart().split(/\r?\n/);
  const start = titleStart(lines);
  for (let n = start + 1; n <= Math.min(start + 12, lines.length); n++) {
    const title = lines.slice(start, n).join("\n");
    const withoutQualifiers = title.replace(/\s+(?:(?:version|revision|rev\.?|v)\s*\d+(?:\.\d+)*|effective(?:\s+date)?\s*[:=]?\s*\d{4}-\d{2}-\d{2})(?:\s+(?:(?:version|revision|rev\.?|v)\s*\d+(?:\.\d+)*|effective(?:\s+date)?\s*[:=]?\s*\d{4}-\d{2}-\d{2}))*\s*$/i, "");
    if (normalizeIdentity(title) === needle || normalizeIdentity(withoutQualifiers) === needle) return n;
  }
  return undefined;
}

function titleStart(lines: string[]): number {
  let start = 0;
  // Recognizable publisher/preprint stamps may precede the title. Never skip
  // arbitrary prose, author lists or another title to find a later mention.
  while (start < Math.min(2, lines.length) && /^(?:arXiv:\d{4}\.\d{4,5}v\d+\s+\[[^\]]+\]\s+\d{1,2}\s+[A-Za-z]+\s+\d{4}|Under review as a conference paper at [A-Z][A-Za-z0-9 -]*\d{4})\s*$/i.test(lines[start]!.trim())) start++;
  return start;
}

function candidateVersions(header: ChunkPayload, titleEnd: number | undefined): string[] | undefined {
  const source = header.source.split(/[\\/]/).pop() ?? header.source;
  const lines = header.text.trimStart().split(/\r?\n/);
  const start = titleStart(lines);
  // Filename aliases do not tell us how many lines the actual title occupies.
  // Infer only a conservative leading title block; never assume one title line.
  if (titleEnd === undefined) {
    for (let n = start; n < Math.min(start + 12, lines.length); n++) {
      const line = lines[n]!.trim();
      const titleWords = line.replace(/\b(?:version|revision|rev\.?|v)\s*\d+(?:\.\d+)*/gi, "").trim().split(/\s+/);
      const isTitle = line.length > 0 && titleWords.every(word => /^(?:[\p{Lu}\p{Lt}][\p{L}\p{N}'’\-]*|a|an|the|of|for|and|or|in|on|to|with|by)$/u.test(word));
      if (!isTitle) { if (n > start) titleEnd = n; break; }
    }
    if (titleEnd === undefined) return undefined;
  }
  const tokens = [...versionTokens(source), ...versionTokens(lines.slice(start, titleEnd).join("\n"))];
  // Only standalone revision/date fields directly below the leading title belong
  // to document identity. Body/model/history mentions are never revision metadata.
  for (const line of lines.slice(titleEnd, titleEnd + 8)) {
    if (!line.trim()) continue;
    if (!/^(?:(?:version|revision|rev\.?|v)\s*[:=]?\s*\d+(?:\.\d+)*|effective(?:\s+date)?\s*[:=]?\s*\d{4}-\d{2}-\d{2})\s*$/i.test(line.trim())) break;
    tokens.push(...versionTokens(line));
  }
  return [...new Set(tokens)];
}

export function resolveFromHeaders(question: string, headers: ChunkPayload[]): DocumentScope {
  const references = explicitReferences(question);
  if (!references.length) return { status: "unrestricted", references };
  const attachedVersions = references.flatMap(ref => referenceVersions(question, ref));
  const versions = [...new Set(attachedVersions)];
  if (versions.filter(v => v.startsWith("version:")).length > 1 || versions.filter(v => v.startsWith("date:")).length > 1)
    return { status: "ambiguous", references, documentIds: [] };
  const ids: string[] = [];
  for (const reference of references) {
    const filename = /\.(pdf|docx|md|txt)$/i.test(reference);
    const needle = normalizeIdentity(reference);
    const candidates = headers.filter(header => {
      const source = header.source.split(/[\\/]/).pop() ?? header.source;
      const sourceMatch = normalizeIdentity(source) === needle;
      // Only the title/header prefix, never body evidence or annotation IDs. Wrapped
      // title lines and Unicode punctuation normalize identically to user text.
      const titleEnd = leadingTitleEnd(header.text.slice(0, 1600), needle);
      const titleMatch = titleEnd !== undefined;
      if (!(filename ? sourceMatch : sourceMatch || titleMatch)) return false;
      // An exact unversioned filename is already a complete identity, including
      // plain notes without a title. Revision selection still needs metadata checks.
      if (filename && sourceMatch && versions.length === 0) return true;
      const present = candidateVersions(header, titleEnd);
      if (present === undefined) return false;
      if (present.filter(v => v.startsWith("version:")).length > 1 || present.filter(v => v.startsWith("date:")).length > 1) return false;
      return versions.every(v => present.includes(v));
    });
    const unique = [...new Set(candidates.map(h => h.documentId))];
    if (unique.length !== 1) return { status: unique.length ? "ambiguous" : "missing", references, documentIds: [] };
    ids.push(unique[0]!);
  }
  // Multiple explicitly requested documents are supported only when each identity is unique.
  return { status: "resolved", references, documentIds: [...new Set(ids)] };
}

export async function resolveDocumentScope(question: string, collection: string): Promise<DocumentScope> {
  if (!explicitReferences(question).length) return { status: "unrestricted", references: [] };
  return resolveFromHeaders(question, await documentHeaders(collection));
}
