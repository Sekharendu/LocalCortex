import { useRef, useState, type ComponentProps } from "react";

// Replaces MDX's <pre>. Fences with a language (```bash) get a header row with
// the language name and a Copy button; plain fences render as a bare block.
// The language arrives as data-language, set by the Shiki transformer in
// vite.config.ts.
export default function CodeBlock(props: ComponentProps<"pre"> & { "data-language"?: string }) {
  const { "data-language": lang, ...rest } = props;
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const showHeader = !!lang && !["text", "txt", "plaintext"].includes(lang);

  async function copy() {
    try {
      await navigator.clipboard.writeText(ref.current?.textContent ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (insecure context / permissions); nothing to do.
    }
  }

  if (!showHeader) return <pre ref={ref} {...rest} />;

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{lang}</span>
        <button type="button" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre ref={ref} {...rest} />
    </div>
  );
}
