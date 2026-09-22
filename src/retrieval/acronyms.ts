// Small, hand-maintained abbreviation -> expansion map. Sparse retrieval can only match
// terms that literally appear somewhere in the corpus -- it structurally cannot bridge
// "PTO" to "vacation" on its own, no matter how the tokenizer is tuned (see the
// hybrid-search hardening plan's abbreviation-category finding). Expanding known
// abbreviations in the query text before both dense embedding and sparse encoding is
// the actual fix for that gap; hybrid retrieval by itself can't close it.
// Kept deliberately short and to terms with no realistic collision risk -- e.g. "hr"
// and "pm" were considered and dropped: both can appear as an isolated letter-run
// inside a larger token like "24hr" or "3pm" (the digit breaks the run, so the regex
// below would still match "hr"/"pm" alone) and falsely expand a time reference.
const ACRONYMS: Record<string, string> = {
  pto: "paid vacation time off",
  wfh: "remote work from home",
  hq: "headquarters",
  intl: "international",
  hsa: "health savings account",
  eap: "employee assistance program wellness",
};

/**
 * Appends each recognized abbreviation's expansion alongside the original word (rather
 * than replacing it), so the literal abbreviation is still matchable if it ever does
 * appear in a corpus, while the expansion supplies the content words sparse/dense
 * retrieval actually need to find the right chunk.
 */
export function expandAcronyms(text: string): string {
  return text.replace(/[A-Za-z]+/g, (word) => {
    const expansion = ACRONYMS[word.toLowerCase()];
    return expansion ? `${word} ${expansion}` : word;
  });
}
