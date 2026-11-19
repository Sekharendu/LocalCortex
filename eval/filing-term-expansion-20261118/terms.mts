// Shared: load the frozen finance term list and expand a search query with it.
import fs from "node:fs";
const T = JSON.parse(fs.readFileSync(new URL("./finance-terms.json", import.meta.url), "utf8"));
export const TERMS: { name: string; res: RegExp[]; expansion: string }[] =
  T.terms.map((t: any) => ({ name: t.name, res: t.triggers.map((s: string) => new RegExp(s, "i")), expansion: t.expansion }));
export function expandFinance(q: string) {
  const fired = TERMS.filter((t) => t.res.some((re) => re.test(q)));
  return { fired: fired.map((t) => t.name), query: fired.length ? `${q} ${fired.map((t) => t.expansion).join(" ")}` : q };
}
