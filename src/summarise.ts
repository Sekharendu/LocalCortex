// "Summarise <document>" by name. A summary request names a document instead of asking
// a question, so it skips retrieval and its 0.63 gate: the named document is read in
// full (or in parts, for long ones) and summarised with the same generation path the
// answers use (src/generation/llm.ts).
//
// Flow, for one user message:
// 1. If the previous assistant message was our "which one?" prompt, try to read this
//    message as the reply ("the second one", "B.docx", "pfizer").
// 2. Otherwise detect summary intent conservatively (detectSummaryIntent). Normal
//    questions return null here and take the usual RAG path untouched, with no extra
//    calls.
// 3. Match the request against the available documents' file names and titles
//    (matchDocuments): one clear match -> summary; several, or none -> a clarification
//    listing the candidates; no documents at all -> a plain message.
import { chunksByDocumentId, documentHeaders } from "./retrieval/vectorStore.js";
import { mergeChunkTexts } from "./retrieval/context.js";
import { generate, generateStream } from "./generation/llm.js";
import { countTokens } from "./generation/tokens.js";
import type { HistoryMessage } from "./generation/promptBuilder.js";
import { answerConfig, answerSettings, contextConfig } from "./config.js";
import type { Citation } from "./types.js";

// ---------------------------------------------------------------------------------
// Available documents
// ---------------------------------------------------------------------------------

export interface AvailableDocument {
  documentId: string;
  /** payload.source as ingested (the original file name). */
  source: string;
  /** What the user sees and types: the file name, unique within one listing. */
  name: string;
  /** First heading / first line of chunk #0, or "" when there is none. */
  title: string;
}

/** Options for listAvailableDocuments; a folder filter will plug in here later. */
export interface DocumentListOptions {
  collection: string;
}

/**
 * The documents a chat can summarise: exactly the documents retrieval searches, i.e.
 * every document with a chunk #0 in the collection the question is answered from
 * (QDRANT_COLLECTION for chats; POST /query's `collection` when given). Qdrant, not the
 * JSON document store, is the source of truth here, because it is what answers read.
 * This is the single place to add a folder filter.
 */
export async function listAvailableDocuments({ collection }: DocumentListOptions): Promise<AvailableDocument[]> {
  const headers = await documentHeaders(collection);
  return toAvailableDocuments(headers);
}

/** Pure part of listAvailableDocuments: names, titles, de-duplication, sort order. */
export function toAvailableDocuments(
  headers: { documentId: string; source: string; text: string; section?: string }[],
): AvailableDocument[] {
  const byId = new Map<string, (typeof headers)[number]>();
  for (const h of headers) if (!byId.has(h.documentId)) byId.set(h.documentId, h);
  const docs = [...byId.values()]
    .map((h) => ({
      documentId: h.documentId,
      source: h.source,
      name: h.source.split(/[\\/]/).pop() || h.source,
      title: titleOf(h.text, h.section),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) || a.documentId.localeCompare(b.documentId));
  // The same file ingested twice: keep both, but give the copies distinct names so a
  // numbered reply can pick either.
  const seen = new Map<string, number>();
  for (const d of docs) {
    const key = d.name.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n > 1) d.name = `${d.name} (copy ${n})`;
  }
  return docs;
}

function titleOf(text: string, section?: string): string {
  // Ingest with context headers stores "Title › Section"; its title part is the cleanest.
  const fromSection = section?.split(" › ")[0]?.trim();
  if (fromSection) return fromSection.slice(0, 120);
  const line = text.split(/\r?\n/).map((l) => l.replace(/^#+\s*/, "").trim()).find((l) => l.length > 0) ?? "";
  // A long first line is prose, not a title: keep only its start so body words don't match.
  return line.length <= 100 ? line : line.split(/\s+/).slice(0, 8).join(" ");
}

// ---------------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------------

export type SummaryIntent = "strong" | "weak";

const LEAD = String.raw`(?:(?:hey|hi|ok|okay|so|now|then|please|pls|kindly|can you|could you|would you|will you|can u|could u|can i|could i|may i|i want you to|i'd like you to|i would like you to|help me)\s*,?\s+)*`;
const NOUN = String.raw`(?:summary|summari[sz]ation|overview|rundown|recap|synopsis|gist|tl;?dr)`;
const STRONG: RegExp[] = [
  // "summarise the handbook", "can you summarize resume.pdf", "tl;dr report.pdf"
  new RegExp(String.raw`^${LEAD}(?:summari[sz]e|sum up|recap|tl;?\s?dr|give me the gist of)\b`, "i"),
  // "give me a short overview of the handbook", "I need a summary of X", "can I get a summary of X"
  new RegExp(
    String.raw`^${LEAD}(?:(?:i|we)(?:\s+(?:really|just))?\s+(?:need|want|would like|'d like|’d like)\s+(?:to\s+(?:get|see|have|read)\s+)?|(?:give|write|provide|get|show|make|produce|create|prepare|send|do)(?:\s+(?:me|us))?(?:\s+with)?\s+)(?:a|an|the|some)\s+(?:[\w.-]+\s+){0,3}?${NOUN}\b(?!\s+(?:report|section|table|page|slide|sheet|field|box)\b)`,
    "i",
  ),
  // "what is the summary of X", "tell me the overview of X"
  new RegExp(String.raw`^(?:what(?:'s|’s|\s+is)|tell me)\s+(?:the|a)\s+(?:(?:short|brief|quick|high[- ]level|general)\s+)?${NOUN}\s+(?:of|for)\b`, "i"),
  // "summary of X", "overview: report.pdf", "tldr - X", or just "summary"
  new RegExp(String.raw`^(?:a\s+)?(?:(?:short|brief|quick)\s+)?${NOUN}\s*(?:(?:of|for|on|:|-)\s*\S|[?.!]*$)`, "i"),
];
const WEAK: RegExp[] = [
  // "what is resume.pdf about?" -- only counts when it names a document (see planSummary)
  /^(?:so\s+)?what(?:'s|’s|\s+is|\s+are)\s+(.+?)\s+(?:all\s+)?about\s*[?.!]*$/i,
  // "what does the handbook cover?"
  /^what\s+(?:does|do)\s+(.+?)\s+(?:cover|contain|talk about|discuss|deal with)\s*[?.!]*$/i,
];

const TOPIC = /\b(?:about|regarding|concerning|related to|on the topic of|with respect to|in terms of|says?|said|mentions?)\s+\S/i;

/** "strong": an explicit summary request. "weak": "what is X about?" / "what does X
 * cover?", a summary only if X names a document. null: a normal question. */
export function detectSummaryIntent(question: string): SummaryIntent | null {
  const q = question.trim().replace(/\s+/g, " ");
  if (!q || q.length > 300) return null;
  if (STRONG.some((r) => r.test(q))) {
    // "Summarise what the handbook says about vacation" asks about a topic, not for a
    // document summary: the normal answer path handles it.
    if (TOPIC.test(q)) return null;
    return "strong";
  }
  if (WEAK.some((r) => r.test(q))) return "weak";
  return null;
}

// ---------------------------------------------------------------------------------
// Name matching
// ---------------------------------------------------------------------------------

// Words that say "summary" or "document" or how to format it, never which document.
const STOPWORDS = new Set(
  ("a an the of for on in to at by with and or from me my our your us we i you it its this that these those " +
    "please pls kindly can could would will may hey hi ok okay so now then help want need like get give write " +
    "provide show make produce create prepare send do tell what whats is are was about all does cover contain " +
    "talk discuss deal summary summaries summarise summarize summarisation summarization sum up recap overview " +
    "rundown synopsis gist tldr tl dr short brief quick high level general whole entire full key main points " +
    "point bullet bullets bulleted list some one ones s d ll re").split(" "),
);
// "the Pfizer report": "report" helps rank but is not required to match.
const GENERIC = new Set("report reports paper papers document documents doc docs file files pdf docx txt md word text notes".split(" "));
// Format requests: "in 3 bullet points", "under 100 words", "in simple words".
const FORMAT_PHRASES =
  /\b(?:in|within|under|using|with|as|into)\s+(?:(?:about|around|at most|max(?:imum)?|no more than|less than|fewer than)\s+)?(?:(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a few|few)\s+(?:bullet\s+points?|bullets?|words?|sentences?|lines?|paragraphs?|points?)|(?:simple|plain)\s+(?:words?|english|language|terms)|short|brief|detail|depth|english)\b/gi;

export function tokens(text: string): string[] {
  return text
    .normalize("NFKC")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function nameTokens(name: string): string[] {
  return tokens(name.replace(/\.(pdf|docx|md|txt)(?=\s*(\(copy \d+\))?$)/i, ""));
}
function extensionOf(name: string): string | undefined {
  return name.match(/\.(pdf|docx|md|txt)(?:\s*\(copy \d+\))?$/i)?.[1]?.toLowerCase();
}

/** Same word, or one is the start of the other ("pfizer" ~ "pfizer's", "handbooks"). */
function wordMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 3) return false;
  return a.startsWith(b) || b.startsWith(a);
}

export interface RequestTerms {
  /** Words that must identify the document. */
  specific: string[];
  /** Optional words that only help rank ("report", "pdf"). */
  generic: string[];
}

/** The words of a request that could name a document. */
export function requestTerms(question: string): RequestTerms {
  const stripped = question.replace(FORMAT_PHRASES, " ");
  const words = tokens(stripped).filter((w) => !STOPWORDS.has(w));
  return {
    specific: [...new Set(words.filter((w) => !GENERIC.has(w)))],
    generic: [...new Set(words.filter((w) => GENERIC.has(w)))],
  };
}

export type MatchResult =
  | { status: "resolved"; doc: AvailableDocument }
  | { status: "ambiguous"; candidates: AvailableDocument[] }
  /** Some words matched, but no document matched all of them. */
  | { status: "partial"; candidates: AvailableDocument[]; terms: RequestTerms }
  | { status: "none"; terms: RequestTerms };

/**
 * Match a request against document names and titles, case-insensitively, ignoring
 * extensions and punctuation, with whole-word prefix matches. A document matches
 * "clearly" only when every specific word of the request is in its name or title; one
 * such document resolves. When several do, one whose file name is exactly what was asked
 * for wins; otherwise an extension word ("the docx") may break the tie; still several ->
 * ambiguous.
 */
export function matchDocuments(question: string, docs: AvailableDocument[]): MatchResult {
  // An exact file name in the request ("what is resume.pdf about?") is the strongest signal.
  const lower = question.toLowerCase();
  const exact = docs.filter((d) => {
    const base = d.name.replace(/\s*\(copy \d+\)$/, "").toLowerCase();
    return /\.(pdf|docx|md|txt)$/.test(base) && new RegExp(String.raw`(^|[^\p{L}\p{N}])${escapeRegExp(base)}($|[^\p{L}\p{N}])`, "u").test(lower);
  });
  if (exact.length === 1) return { status: "resolved", doc: exact[0]! };
  if (exact.length > 1) return { status: "ambiguous", candidates: exact };

  const terms = requestTerms(question);
  if (terms.specific.length === 0) return { status: "none", terms };

  const scored = docs.map((doc) => {
    const name = nameTokens(doc.name);
    const title = tokens(doc.title);
    const ext = extensionOf(doc.name);
    let inName = 0, covered = 0, score = 0;
    // The request names exactly this file ("the sample" -> sample.txt): every word of the
    // name is in the request too.
    const nameExact = name.length > 0 && name.every((n) => terms.specific.some((t) => wordMatch(t, n)));
    for (const t of terms.specific) {
      if (name.some((n) => wordMatch(t, n))) { inName++; covered++; score += 2; }
      else if (title.some((n) => wordMatch(t, n))) { covered++; score += 1; }
    }
    for (const g of terms.generic) {
      if (g === ext || name.some((n) => n === g) || title.some((n) => n === g)) score += 0.5;
    }
    return { doc, inName, covered, score, nameExact };
  });
  const total = terms.specific.length;
  const full = scored.filter((s) => s.covered === total);
  if (full.length === 1) return { status: "resolved", doc: full[0]!.doc };
  if (full.length > 1) {
    // Several documents hold every word; one whose whole name is what was asked for wins
    // ("employee handbook" -> employee-handbook.txt over a title "Employee Handbook").
    const byName = full.filter((s) => s.inName === total && s.nameExact);
    if (byName.length === 1) return { status: "resolved", doc: byName[0]!.doc };
    const best = Math.max(...full.map((s) => s.score));
    const top = full.filter((s) => s.score === best);
    // Ties on everything but the extension ("eval-corpus docx" vs .txt): the generic word decides.
    if (top.length === 1 && terms.generic.length > 0) return { status: "resolved", doc: top[0]!.doc };
    return { status: "ambiguous", candidates: full.sort((a, b) => b.score - a.score).map((s) => s.doc) };
  }
  const partial = scored.filter((s) => s.covered > 0).sort((a, b) => b.covered - a.covered || b.score - a.score);
  if (partial.length > 0) return { status: "partial", candidates: partial.map((s) => s.doc), terms };
  return { status: "none", terms };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------------
// Clarification ("which one?") prompt and the reply to it
// ---------------------------------------------------------------------------------

/** Marker line that identifies our clarification in the conversation history. */
export const WHICH_ONE_LINE = "Which one would you like me to summarise? Reply with its number or name:";
export const MAX_LISTED = 10;
export const NO_DOCUMENTS_MESSAGE = "There are no documents to summarise yet. Add a document first, then ask again.";

export function clarificationMessage(candidates: AvailableDocument[], lead?: string): string {
  const shown = candidates.slice(0, MAX_LISTED);
  const lines = shown.map((d, i) => `${i + 1}. ${d.name}`);
  const more = candidates.length > shown.length
    ? `\n…and ${candidates.length - shown.length} more. Type part of a name to pick one of those.`
    : "";
  return `${lead ? `${lead} ` : ""}${WHICH_ONE_LINE}\n${lines.join("\n")}${more}`;
}

/** The file names our last clarification listed, or null when the latest assistant
 * message is not a clarification. Only the immediately previous turn counts. */
export function listedCandidates(history: HistoryMessage[]): string[] | null {
  const last = history[history.length - 1];
  if (!last || last.role !== "assistant" || !last.content.includes(WHICH_ONE_LINE)) return null;
  const after = last.content.slice(last.content.indexOf(WHICH_ONE_LINE) + WHICH_ONE_LINE.length);
  const names = [...after.matchAll(/^\s*(\d+)\.\s+(.+?)\s*$/gm)].map((m) => m[2]!);
  return names.length ? names : null;
}

const ORDINALS: Record<string, number> = {
  first: 1, "1st": 1, one: 1, second: 2, "2nd": 2, two: 2, third: 3, "3rd": 3, three: 3,
  fourth: 4, "4th": 4, four: 4, fifth: 5, "5th": 5, five: 5, sixth: 6, "6th": 6, six: 6,
  seventh: 7, "7th": 7, seven: 7, eighth: 8, "8th": 8, eight: 8, ninth: 9, "9th": 9, nine: 9,
  tenth: 10, "10th": 10, ten: 10,
};
const QUESTION_START = /^(?:how|what|when|where|why|who|whom|whose|which|does|do|did|is|are|was|were|can|could|should|will|would|has|have|tell|explain|list|compare)\b/i;

export type ReplyResult =
  | { status: "resolved"; doc: AvailableDocument }
  | { status: "ambiguous"; candidates: AvailableDocument[] }
  | { status: "none" };

/**
 * Read a message as the reply to a "which one?" prompt. `listed` are the names the
 * prompt showed (in order); `docs` are all documents available now. Accepts a number or
 * ordinal ("2", "#2", "the second one", "the last one"), a name or part of one, or an
 * extension ("the pdf"). A message that looks like a new question is not a reply.
 */
export function resolveClarificationReply(reply: string, listed: string[], docs: AvailableDocument[]): ReplyResult {
  const text = reply.trim().replace(/\s+/g, " ");
  const listedDocs = listed
    .map((n) => docs.find((d) => d.name.toLowerCase() === n.toLowerCase()))
    .filter((d): d is AvailableDocument => d !== undefined);
  const intent = detectSummaryIntent(text);
  const words = tokens(text);
  if (!text || words.length > 12) return { status: "none" };
  if (QUESTION_START.test(text) && !intent && !/^which\b/i.test(text)) return { status: "none" };

  // Exact name first: "B.docx".
  const exact = listedDocs.filter((d) => text.toLowerCase().includes(d.name.toLowerCase()));
  if (exact.length === 1) return { status: "resolved", doc: exact[0]! };

  // A number or ordinal into the listed names.
  const pick = (i: number): ReplyResult => {
    const name = listed[i - 1];
    const doc = name ? docs.find((d) => d.name.toLowerCase() === name.toLowerCase()) : undefined;
    return doc ? { status: "resolved", doc } : { status: "none" };
  };
  const num = text.match(/^(?:(?:the|number|no\.?|option|#)\s*)*(\d{1,2})(?:st|nd|rd|th)?\b(?:\s*(?:one|please|pls|thanks))*[.!]*$/i);
  if (num) return pick(Number(num[1]));
  if (/^(?:the\s+)?(?:number\s+|option\s+)?one[.!]*$/i.test(text)) return pick(1);
  const ordinalWords = words.filter((w) => (w in ORDINALS && w !== "one") || w === "last");
  const nonFiller = words.filter((w) => !STOPWORDS.has(w) && !(w in ORDINALS) && w !== "last" && w !== "number" && w !== "option" && w !== "no" && w !== "thanks");
  if (ordinalWords.length === 1 && nonFiller.length === 0) {
    const w = ordinalWords[0]!;
    return pick(w === "last" ? listed.length : ORDINALS[w]!);
  }

  // An extension alone: "the pdf", "the word one".
  const extWords = words.filter((w) => ["pdf", "docx", "word", "txt", "text", "md", "markdown"].includes(w));
  const rest = nonFiller.filter((w) => !extWords.includes(w) && !GENERIC.has(w));
  if (extWords.length === 1 && rest.length === 0) {
    const want = { word: "docx", text: "txt", markdown: "md" }[extWords[0]!] ?? extWords[0]!;
    const hits = listedDocs.filter((d) => extensionOf(d.name) === want);
    if (hits.length === 1) return { status: "resolved", doc: hits[0]! };
    if (hits.length > 1) return { status: "ambiguous", candidates: hits };
  }

  // A name or part of one: against the listed documents first, then all of them (the
  // list may have been cut at MAX_LISTED, or the user picked one not shown).
  for (const pool of [listedDocs, docs]) {
    const m = matchDocuments(text, pool);
    if (m.status === "resolved") return m;
    if (m.status === "ambiguous") return m;
    // Inside the which-one context a partial match on one candidate is clear enough.
    if (m.status === "partial" && m.candidates.length === 1) return { status: "resolved", doc: m.candidates[0]! };
    if (m.status === "partial") return { status: "ambiguous", candidates: m.candidates };
  }
  return { status: "none" };
}

// ---------------------------------------------------------------------------------
// Planning: what to do with this message
// ---------------------------------------------------------------------------------

export type SummaryPlan =
  | { kind: "message"; text: string }
  | { kind: "summary"; doc: AvailableDocument };

/** Pure decision given the documents; planSummary adds the lookups. */
export function decideSummary(
  question: string,
  history: HistoryMessage[],
  docs: AvailableDocument[],
): SummaryPlan | null {
  const listed = listedCandidates(history);
  const intent = detectSummaryIntent(question);
  if (listed) {
    const r = resolveClarificationReply(question, listed, docs);
    if (r.status === "resolved") return { kind: "summary", doc: r.doc };
    if (r.status === "ambiguous") return { kind: "message", text: clarificationMessage(r.candidates) };
  }
  if (!intent) return null;
  if (docs.length === 0) return intent === "strong" ? { kind: "message", text: NO_DOCUMENTS_MESSAGE } : null;
  const m = matchDocuments(question, docs);
  if (m.status === "resolved") return { kind: "summary", doc: m.doc };
  if (m.status === "ambiguous") return { kind: "message", text: clarificationMessage(m.candidates) };
  // "What is the vacation policy about?" names no document: an ordinary question.
  if (intent === "weak") return null;
  if (m.status === "none" && m.terms.specific.length === 0) {
    // "Summarise it" / "summarise the document" with a single document: no doubt which.
    if (docs.length === 1) return { kind: "summary", doc: docs[0]! };
    return { kind: "message", text: clarificationMessage(docs) };
  }
  const wanted = [...m.terms.specific, ...m.terms.generic].join(" ");
  const lead = `I couldn't find a document called "${wanted}".`;
  const ordered = m.status === "partial" ? [...m.candidates, ...docs.filter((d) => !m.candidates.includes(d))] : docs;
  return { kind: "message", text: clarificationMessage(ordered, lead) };
}

/** null: not a summary request -- answer it the normal way. Only touches Qdrant when the
 * message looks like a summary request or a reply to our "which one?" prompt. */
export async function planSummary(
  question: string,
  history: HistoryMessage[],
  options: DocumentListOptions,
): Promise<SummaryPlan | null> {
  if (!detectSummaryIntent(question) && !listedCandidates(history)) return null;
  return decideSummary(question, history, await listAvailableDocuments(options));
}

// ---------------------------------------------------------------------------------
// Summarising
// ---------------------------------------------------------------------------------

export const SUMMARY_SYSTEM_PROMPT = `You write faithful summaries of documents. Use only the document text you are given: do not add outside facts, opinions or guesses, and do not invent numbers, names or dates. Write about the document itself; do not mention "the text", "the excerpt", "the passages" or "the notes" you were given, and do not add a sources line.`;

/** Most generation calls one summary may make (partial summaries + the final combine). */
export const MAX_SUMMARY_CALLS = Number(process.env.SUMMARY_MAX_CALLS ?? 12);
/** Same template-overhead estimate as contextBudget in rag.ts. */
const TEMPLATE_OVERHEAD_TOKENS = 32;
const PARTIAL_MAX_TOKENS = 400;

/** The final call gets answerConfig.maxOutputTokens (512); an unbounded summary was cut
 * off mid-sentence in the live check, so ask for a length that fits. */
const LENGTH_RULE = "Unless the user asked for a different length, keep it under about 250 words (at most 10 bullet points), choosing the most important points from the whole document.";

function userAsked(question: string): string {
  return `The user asked: "${question.trim().slice(0, 300)}". Follow any length or format they asked for.`;
}

export function wholePrompt(name: string, text: string, question: string): string {
  return `Document "${name}":\n\n${text}\n\n---\n${userAsked(question)}\nWrite a summary of the document "${name}": start with one or two sentences saying what it is and what it is for, then its main points as short bullet points, keeping key numbers, names, dates and conditions. ${LENGTH_RULE}\nSummary:`;
}

export function partialPrompt(name: string, part: number, parts: number, where: string, text: string): string {
  return `Part ${part} of ${parts} of the document "${name}"${where}:\n\n${text}\n\n---\nList the main points of this part as short bullet points (at most 8), keeping key numbers, names, dates and conditions. Use only this part.\nPoints:`;
}

export function combinePrompt(name: string, notes: string[], question: string, coverage: string): string {
  const body = notes.map((n, i) => `Part ${i + 1}:\n${n}`).join("\n\n");
  return `Notes on consecutive parts of the document "${name}", in reading order${coverage}:\n\n${body}\n\n---\n${userAsked(question)}\nWrite one summary of the whole document "${name}" from these notes: start with one or two sentences saying what it is and what it is for, then its main points as short bullet points, keeping key numbers, names, dates and conditions. Cover every part, including the last ones. Do not repeat points. ${LENGTH_RULE}\nSummary:`;
}

/** Tokens left for document text in one call, counted the way contextBudget counts. */
export function summaryBudget(skeleton: string, numCtx = answerSettings().numCtx): number {
  return numCtx - TEMPLATE_OVERHEAD_TOKENS - countTokens(SUMMARY_SYSTEM_PROMPT) - countTokens(skeleton) - contextConfig.answerReserveTokens;
}

export interface ChunkGroup {
  /** Merged text of the group's chunks, overlap removed. */
  text: string;
  /** Indices into the chunk array, in reading order. */
  indices: number[];
  firstPage?: number;
  lastPage?: number;
}

/**
 * Split a document's chunks (reading order) into consecutive groups whose merged text
 * fits `budget` tokens. A single chunk over budget forms its own group (never cut).
 */
export function groupChunks(
  chunks: { text: string; page?: number }[],
  budget: number,
  count: (text: string) => number = countTokens,
): ChunkGroup[] {
  const groups: ChunkGroup[] = [];
  let current: number[] = [];
  let tokensSoFar = 0;
  const flush = () => {
    if (!current.length) return;
    const pages = current.map((i) => chunks[i]!.page).filter((p): p is number => p !== undefined);
    groups.push({
      text: mergeChunkTexts(current.map((i) => chunks[i]!.text)),
      indices: current,
      ...(pages.length ? { firstPage: Math.min(...pages), lastPage: Math.max(...pages) } : {}),
    });
    current = [];
    tokensSoFar = 0;
  };
  chunks.forEach((c, i) => {
    // Per-chunk counts slightly overestimate the merged text (the overlap is counted
    // twice), which only errs on the safe side of the budget.
    const t = count(c.text) + 1;
    if (current.length && tokensSoFar + t > budget) flush();
    current.push(i);
    tokensSoFar += t;
  });
  flush();
  return groups;
}

export interface SummaryPlanOfCalls {
  /** One call with the whole document, or partial calls then a combine. */
  mode: "whole" | "two-stage";
  groups: ChunkGroup[];
  /** Groups actually summarised (all of them unless capped). */
  used: number;
  /** Set when the call cap left part of the document out. */
  coverageNote?: string;
}

/** Decide whole vs two-stage and apply the call cap. Pure, for testing. */
export function planCalls(
  name: string,
  chunks: { text: string; page?: number }[],
  question: string,
  maxCalls = MAX_SUMMARY_CALLS,
  count: (text: string) => number = countTokens,
  numCtx?: number,
): SummaryPlanOfCalls {
  const wholeBudget = summaryBudget(wholePrompt(name, "", question), numCtx);
  const merged = mergeChunkTexts(chunks.map((c) => c.text));
  // Counting a 300-page filing is wasted work when it obviously cannot fit.
  if (merged.length <= wholeBudget * 8 && count(merged) <= wholeBudget) {
    return { mode: "whole", groups: [{ text: merged, indices: chunks.map((_, i) => i) }], used: 1 };
  }
  const partBudget = summaryBudget(partialPrompt(name, 99, 99, " (pages 999-999)", ""), numCtx);
  const groups = groupChunks(chunks, partBudget, count);
  const maxParts = Math.max(1, maxCalls - 1);
  const used = Math.min(groups.length, maxParts);
  let coverageNote: string | undefined;
  if (used < groups.length) {
    const coveredChunks = groups.slice(0, used).reduce((s, g) => s + g.indices.length, 0);
    const pct = Math.round((coveredChunks / chunks.length) * 100);
    const lastPage = groups[used - 1]!.lastPage;
    const pages = lastPage !== undefined ? ` (up to page ${lastPage})` : "";
    coverageNote = `Note: this document is too long to summarise in full; this summary covers only about the first ${pct}% of it${pages}.`;
  }
  return { mode: "two-stage", groups, used, coverageNote };
}

export interface SummarySetup {
  tokens: AsyncGenerator<string>;
  citations: Citation[];
}

async function* once(text: string): AsyncGenerator<string> {
  yield text;
}

/** A plan that is only a message (clarification, no documents): stream it as-is. */
export function messageSetup(text: string): SummarySetup {
  return { tokens: once(text), citations: [] };
}

export interface SummariseOptions {
  collection: string;
  /** true: stream the final call token by token; false: one generate() call per step. */
  stream: boolean;
  signal?: AbortSignal;
}

/**
 * Eager part: read the document's chunks from Qdrant (so an outage is a 503 before any
 * bytes, like retrieval) and plan the calls. Lazy part (the generator): partial
 * summaries, then the final summary, which streams. The partial stage runs inside the
 * generator because it can take minutes on a long document; its failures surface like
 * any mid-stream generation error.
 */
export async function prepareSummary(
  doc: AvailableDocument,
  question: string,
  { collection, stream, signal }: SummariseOptions,
): Promise<SummarySetup> {
  signal?.throwIfAborted();
  const chunks = await chunksByDocumentId(collection, doc.documentId);
  signal?.throwIfAborted();
  const citations: Citation[] = [{ source: doc.source }];
  if (chunks.length === 0) return { tokens: once(`"${doc.name}" has no text to summarise.`), citations };
  const plan = planCalls(doc.name, chunks, question);
  return { tokens: runSummary(doc.name, question, plan, stream, signal), citations };
}

async function* runSummary(
  name: string,
  question: string,
  plan: SummaryPlanOfCalls,
  stream: boolean,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const final = (prompt: string): AsyncGenerator<string> =>
    stream
      ? generateStream(prompt, signal, { system: SUMMARY_SYSTEM_PROMPT, maxTokens: answerConfig.maxOutputTokens })
      : (async function* () {
          yield await generate(prompt, { signal, system: SUMMARY_SYSTEM_PROMPT, maxTokens: answerConfig.maxOutputTokens });
        })();

  if (plan.mode === "whole") {
    yield* final(wholePrompt(name, plan.groups[0]!.text, question));
    return;
  }
  const groups = plan.groups.slice(0, plan.used);
  // Keep all partial notes inside one combine call's budget.
  const combineBudget = summaryBudget(combinePrompt(name, groups.map(() => ""), question, " (first 99%)"));
  const partialMax = Math.max(64, Math.min(PARTIAL_MAX_TOKENS, Math.floor(combineBudget / groups.length) - 8));
  const notes: string[] = [];
  for (const [i, g] of groups.entries()) {
    signal?.throwIfAborted();
    const where = g.firstPage !== undefined
      ? g.firstPage === g.lastPage ? ` (page ${g.firstPage})` : ` (pages ${g.firstPage}-${g.lastPage})`
      : "";
    notes.push(await generate(partialPrompt(name, i + 1, plan.groups.length, where, g.text), {
      signal, system: SUMMARY_SYSTEM_PROMPT, maxTokens: partialMax,
    }));
  }
  signal?.throwIfAborted();
  const coverage = plan.coverageNote ? " (the document was too long; these notes cover only its first part)" : "";
  yield* final(combinePrompt(name, notes, question, coverage));
  if (plan.coverageNote) yield `\n\n${plan.coverageNote}`;
}
