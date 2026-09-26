import type { PageHeading } from "../lib/remark-headings";

declare module "*.mdx" {
  export const headings: PageHeading[];
}
