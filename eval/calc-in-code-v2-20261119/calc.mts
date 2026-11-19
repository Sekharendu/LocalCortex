// Calc-in-code prototype, VERSION 2 (eval only; NOT app code). Copied from eval/calc-in-code-20261119/calc.mts with only
// these v2 changes: (a) MAX_CALCS 8 -> 20; (b) a standalone "x"/"X" between two operands is read as multiplication
// ("ratio x 100", for the percent instruction). Everything else is v1 unchanged. The model writes
//   CALC: name = <expression>
// lines (numbers copied from the passages, + - * / parentheses, unary minus, percent literals, earlier names)
// and {name} placeholders in its prose. This module parses the lines with a tiny recursive-descent evaluator
// (no eval / Function), checks that every number literal in an expression appears in the prompt context
// (provenance), checks that every number written in the prose is copied from the context/question (prose check),
// formats each result, substitutes the placeholders and strips the CALC lines. Any failure -> the whole answer is
// replaced by the refusal sentence (never show a figure the code did not verify).

export const REFUSAL = "The provided context is insufficient to answer this question.";
/** Literals allowed in an expression without provenance (percent, days/year, months, averages of 2-5 items, thousands). */
export const CONSTANTS = [1, 2, 3, 4, 5, 10, 12, 100, 365, 1000];
export const MAX_CALCS = 20;

// ---------------- tokenizer + evaluator ----------------
type Tok = { t: "num"; text: string; value: number; pct: boolean } | { t: "id"; name: string } | { t: "op"; v: string };

export class CalcError extends Error {}

const NUM_RE = /^(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)/;

export function tokenize(src: string): Tok[] {
  const s = src.replace(/[−–]/g, "-").replace(/×/g, "*").replace(/÷/g, "/");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c) || c === "$") { i++; continue; }
    const m = NUM_RE.exec(s.slice(i));
    if (m) {
      // a digit run directly followed by another digit/comma-digit that NUM_RE rejected (e.g. "1,23") is an error
      const rest = s.slice(i + m[0].length);
      if (/^(,\d|\d|\.)/.test(rest)) throw new CalcError(`bad number near "${s.slice(i, i + m[0].length + 3)}"`);
      i += m[0].length;
      let pct = false;
      let j = i; while (s[j] === " ") j++;
      if (s[j] === "%") { pct = true; i = j + 1; }
      out.push({ t: "num", text: m[0], value: Number(m[0].replace(/,/g, "")), pct });
      continue;
    }
    const id = /^\{?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}?/.exec(s.slice(i));
    if (id) {
      // v2: "a x 100" -> "a * 100" (a lone x/X after an operand and before a number, name or "(")
      const prev = out[out.length - 1];
      const afterOperand = !!prev && (prev.t === "num" || prev.t === "id" || (prev.t === "op" && prev.v === ")"));
      if ((id[1] === "x" || id[1] === "X") && !id[0].includes("{") && afterOperand && /^\s*[\d.(A-Za-z_{$]/.test(s.slice(i + id[0].length))) {
        out.push({ t: "op", v: "*" }); i += id[0].length; continue;
      }
      out.push({ t: "id", name: id[1] }); i += id[0].length; continue;
    }
    if ("+-*/()".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    throw new CalcError(`unexpected character "${c}"`);
  }
  return out;
}

export type Literal = { text: string; value: number; pct: boolean };

/** Evaluate an expression; `names` = results of earlier CALC lines. Returns value + number literals used. */
export function evaluate(src: string, names: Map<string, number> = new Map()): { value: number; literals: Literal[] } {
  const toks = tokenize(src);
  if (toks.length === 0) throw new CalcError("empty expression");
  let p = 0;
  const literals: Literal[] = [];
  const peek = () => toks[p];
  const isOp = (v: string) => { const k = toks[p]; return !!k && k.t === "op" && k.v === v; };
  function expr(): number {
    let v = term();
    while (isOp("+") || isOp("-")) { const o = (toks[p++] as any).v; const r = term(); v = o === "+" ? v + r : v - r; }
    return v;
  }
  function term(): number {
    let v = unary();
    while (isOp("*") || isOp("/")) {
      const o = (toks[p++] as any).v; const r = unary();
      if (o === "/" && r === 0) throw new CalcError("division by zero");
      v = o === "*" ? v * r : v / r;
    }
    return v;
  }
  function unary(): number {
    if (isOp("-")) { p++; return -unary(); }
    if (isOp("+")) { p++; return unary(); }
    return primary();
  }
  function primary(): number {
    const k = peek();
    if (!k) throw new CalcError("unexpected end");
    if (k.t === "num") { p++; literals.push({ text: k.text, value: k.value, pct: k.pct }); return k.pct ? k.value / 100 : k.value; }
    if (k.t === "id") {
      p++;
      if (isOp("(")) throw new CalcError(`functions are not allowed (${k.name})`);
      if (!names.has(k.name)) throw new CalcError(`unknown name ${k.name}`);
      return names.get(k.name)!;
    }
    if (isOp("(")) { p++; const v = expr(); if (!isOp(")")) throw new CalcError("missing )"); p++; return v; }
    throw new CalcError(`unexpected token ${JSON.stringify(k)}`);
  }
  const v = expr();
  if (p !== toks.length) throw new CalcError(`trailing tokens after position ${p}`);
  if (!Number.isFinite(v)) throw new CalcError("non-finite result");
  return { value: v, literals };
}

// ---------------- provenance ----------------
const SCALE: Record<string, number> = { thousand: 1e3, thousands: 1e3, k: 1e3, million: 1e6, millions: 1e6, mn: 1e6, m: 1e6, billion: 1e9, billions: 1e9, bn: 1e9, b: 1e9 };
const CTX_NUM_RE = /(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)(\s*(thousands?|millions?|billions?|mn|bn|k|m|b)\b)?/gi;

export type NumberIndex = { values: number[] };

/** All numbers in a text (commas, $, parentheses and signs ignored -> absolute values), plus scaled forms
 *  when a scale word follows ("6.5 billion" also gives 6500 [millions], 6,500,000 [thousands], 6.5e9). */
export function indexNumbers(text: string): NumberIndex {
  const vals = new Set<number>();
  for (const m of text.matchAll(CTX_NUM_RE)) {
    const v = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(v)) continue;
    vals.add(v);
    const sc = m[3] ? SCALE[m[3].toLowerCase()] : 0;
    if (sc) { const full = v * sc; for (const d of [1, 1e3, 1e6, 1e9]) vals.add(full / d); }
  }
  return { values: [...vals] };
}

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/** A CALC literal must be copied: equal (absolute value) to a context number, or one of CONSTANTS (not a percent literal). */
export function literalFound(lit: Literal, idx: NumberIndex): boolean {
  const v = Math.abs(lit.value);
  if (!lit.pct && CONSTANTS.some((c) => close(c, v))) return true;
  return idx.values.some((c) => close(c, v));
}

/** A number written in the prose is "copied" if it equals a context/question number at the precision written
 *  (e.g. context 39.73 -> "39.7"), or is an integer 0-10 written without decimals, or a year 1900-2099, or one of CONSTANTS. Unit changes by 1e3 steps
 *  (9,497,578 [thousands] -> "9.5 billion") are accepted only when a scale word follows the prose number. */
export function proseNumberFound(text: string, idx: NumberIndex, scaleWord = false): boolean {
  const v = Number(text.replace(/,/g, ""));
  if (!Number.isFinite(v)) return true;
  if (Number.isInteger(v) && v >= 0 && v <= 10 && !text.includes(".")) return true;
  if (/^(19|20)\d\d$/.test(text)) return true; // a year
  if (!text.includes(".") && CONSTANTS.includes(v)) return true; // "x 100", "365 days"
  const dec = text.includes(".") ? text.split(".")[1].length : 0;
  const tol = 0.5 * Math.pow(10, -dec) + 1e-9 * Math.max(1, v);
  const ks = scaleWord ? [1, 1e3, 1e-3, 1e6, 1e-6, 1e9, 1e-9] : [1];
  return idx.values.some((c) => ks.some((k) => Math.abs(c * k - v) <= tol));
}

// ---------------- formatting ----------------
/** Decimals the question asks for; default 2. */
export function decimalsFor(question: string): number {
  const q = question.toLowerCase();
  if (/\b(nearest|to the) (whole|integer)|whole (number|percent)|nearest (percent|dollar|million|billion)\b/.test(q)) return 0;
  const m = /\b(one|two|three|four|1|2|3|4) (decimal|decimal places?|digits? after the decimal)/.exec(q);
  if (m) return { one: 1, two: 2, three: 3, four: 4, "1": 1, "2": 2, "3": 3, "4": 4 }[m[1]]!;
  if (/\bnearest tenth\b/.test(q)) return 1;
  if (/\bnearest hundredth\b/.test(q)) return 2;
  return 2;
}

/** Fixed decimals with thousands separators; exact integers are shown without decimals. */
export function formatResult(v: number, decimals: number): string {
  const r = Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
  const isInt = Math.abs(v - Math.round(v)) < 1e-9;
  const s = isInt ? Math.round(v).toLocaleString("en-US") :
    r.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return s === "-0" || /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
}

// ---------------- whole-answer post-processing ----------------
export type CalcRecord = { name: string; expr: string; value?: number; shown?: string; literals?: Literal[]; missing?: string[]; error?: string };
export type Processed = {
  final: string;
  status: "no-calc" | "computed" | "fallback";
  reason: string;
  produced: boolean;      // at least one CALC line
  parsed: boolean;        // every CALC line parsed and evaluated
  provenanceOk: boolean;  // every literal found in context
  proseOk: boolean;       // every prose number copied
  calcFirst: boolean;     // CALC lines came before the prose
  placeholdersUsed: number;
  calcs: CalcRecord[];
  proseViolations: string[];
};

const CALC_LINE = /^[ \t>*_-]*`?\s*\**CALC\**\s*:\s*(.*?)`?\s*$/i;
const PLACEHOLDER = /\{\{?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}?\}/g;
const PROSE_NUM_RE = /(?<![0-9_.,])(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(\s*(?:thousands?|millions?|billions?|mn|bn|k|m|b)\b)?/gi;

/**
 * @param raw      the model's reply
 * @param context  the context passages (the user prompt before the reminder / history)
 * @param question the user's question (its numbers are allowed in the prose, not in expressions)
 */
export function processAnswer(raw: string, context: string, question: string): Processed {
  const lines = raw.split(/\r?\n/);
  const calcs: CalcRecord[] = [];
  const prose: string[] = [];
  let firstCalc = -1, firstProse = -1;
  lines.forEach((l, i) => {
    const m = CALC_LINE.exec(l);
    if (m) {
      if (firstCalc < 0) firstCalc = i;
      // "**CALC:** x = ..." leaves "**" in front; a trailing "= 21.7" (the model's own result) and a final "." are ignored
      const b = m[1].replace(/^\*+\s*/, "").trim();
      const body = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^=]+?)(?:=.*)?$/.exec(b);
      calcs.push(body ? { name: body[1], expr: body[2].trim().replace(/[.;]+$/, "").trim() } : { name: "", expr: m[1].trim(), error: "malformed CALC line" });
    } else {
      if (l.trim() && firstProse < 0) firstProse = i;
      prose.push(l);
    }
  });
  let text = prose.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const produced = calcs.length > 0;
  const base = { produced, calcFirst: produced && (firstProse < 0 || firstCalc < firstProse), calcs };
  const ctxIdx = indexNumbers(context);
  const proseIdx = indexNumbers(context + "\n" + question);
  const fallback = (reason: string, extra: Partial<Processed>): Processed =>
    ({ final: REFUSAL, status: "fallback", reason, parsed: false, provenanceOk: false, proseOk: false, placeholdersUsed: 0, proseViolations: [], ...base, ...extra });

  // 1. evaluate CALC lines in order
  const names = new Map<string, number>();
  let parsed = true, provenanceOk = true;
  const dec = decimalsFor(question);
  if (calcs.length > MAX_CALCS) return fallback(`more than ${MAX_CALCS} CALC lines`, {});
  for (const c of calcs) {
    if (c.error) { parsed = false; continue; }
    if (names.has(c.name)) { c.error = `duplicate name ${c.name}`; parsed = false; continue; }
    try {
      const r = evaluate(c.expr, names);
      c.value = r.value; c.literals = r.literals; c.shown = formatResult(r.value, dec);
      c.missing = r.literals.filter((l) => !literalFound(l, ctxIdx)).map((l) => l.text + (l.pct ? "%" : ""));
      if (c.missing.length) provenanceOk = false;
      names.set(c.name, r.value);
    } catch (e) { c.error = String((e as Error).message); parsed = false; }
  }
  // 2. prose numbers (checked before placeholders are filled)
  const proseViolations = [...text.replace(PLACEHOLDER, " ").matchAll(PROSE_NUM_RE)].filter((m) => !proseNumberFound(m[1], proseIdx, !!m[2])).map((m) => m[1]);
  const proseOk = proseViolations.length === 0;
  // 3. placeholders
  let placeholdersUsed = 0; const unknown: string[] = [];
  const shown = new Map(calcs.filter((c) => c.shown !== undefined && !c.error && !(c.missing?.length)).map((c) => [c.name, c.shown!]));
  const filled = text.replace(PLACEHOLDER, (all, n) => { if (shown.has(n)) { placeholdersUsed++; return shown.get(n)!; } unknown.push(n); return all; });
  const st = { parsed, provenanceOk, proseOk, placeholdersUsed, proseViolations };
  if (!parsed) return fallback("CALC parse/eval error: " + calcs.filter((c) => c.error).map((c) => `${c.name || "?"}: ${c.error}`).join("; "), st);
  if (!provenanceOk) return fallback("number not in context: " + calcs.filter((c) => c.missing?.length).map((c) => `${c.name}: ${c.missing!.join(",")}`).join("; "), st);
  if (unknown.length) return fallback("placeholder without a valid CALC: " + unknown.join(","), st);
  if (!proseOk) return fallback("prose number not in context: " + proseViolations.join(","), st);
  if (/\bCALC\b|[{}]/.test(filled)) return fallback("leftover CALC/brace text", st);
  if (!filled.trim()) return fallback("empty prose", st);
  return { final: filled, status: produced ? "computed" : "no-calc", reason: produced ? "ok" : "no CALC lines", ...base, ...st };
}

/** The context passages of a user prompt built by the app's buildPrompt: text before the history block / reminder. */
export function contextOf(prompt: string, reminder: string): string {
  let end = prompt.indexOf(reminder);
  if (end < 0) end = prompt.lastIndexOf("\n\nQuestion:");
  const h = prompt.indexOf("Conversation so far (for resolving references only");
  if (h >= 0 && h < end) end = h;
  return prompt.slice(0, Math.max(0, end));
}
