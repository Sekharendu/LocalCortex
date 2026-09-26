import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import { Parser } from "acorn";
import type { Root, Heading } from "mdast";

export interface PageHeading {
  depth: 2 | 3;
  text: string;
  id: string;
}

/**
 * Collects every h2/h3 in an MDX page and injects `export const headings = [...]`
 * as a real ESTree node (mdxjsEsm nodes are compiled from `data.estree`, not the
 * `value` string, so the export has to be parsed with acorn to be valid MDX).
 *
 * rehype-slug runs later, on hast, and assigns ids with the same slugger over the
 * same heading text in document order — so the ids exported here always match the
 * ids actually rendered on the page. The right-hand TOC (Toc.tsx) just links to
 * `#${id}`, no DOM scanning needed.
 */
export function remarkHeadings() {
  return (tree: Root) => {
    const slugger = new GithubSlugger();
    const headings: PageHeading[] = [];

    visit(tree, "heading", (node: Heading) => {
      if (node.depth !== 2 && node.depth !== 3) return;
      const text = toString(node);
      const id = slugger.slug(text);
      headings.push({ depth: node.depth, text, id });
    });

    const source = `export const headings = ${JSON.stringify(headings)};`;
    const estree = Parser.parse(source, { sourceType: "module", ecmaVersion: "latest" });

    tree.children.push({
      type: "mdxjsEsm",
      value: source,
      data: { estree },
    } as never);
  };
}
