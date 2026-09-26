import { useState } from "react";
import { CopyIcon, CheckIcon } from "./Icons";

// Copies the raw MDX source of the current page (fetched from its .md sibling
// — see the Markdown-source note in src/lib) so it can be pasted into an LLM,
// the same "Copy page" affordance agentskills.io has.
export default function CopyPageButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const res = await fetch(`${path === "/" ? "/index" : path}.md`);
      const text = res.ok ? await res.text() : window.location.href;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied (permissions, non-secure context); fail quietly.
    }
  }

  return (
    <button type="button" className="copy-page-button" onClick={handleCopy}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copied" : "Copy page"}
    </button>
  );
}
