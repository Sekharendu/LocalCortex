import type { ReactNode } from "react";

const METHOD_CLASS: Record<string, string> = {
  GET: "method-get",
  POST: "method-post",
  PATCH: "method-patch",
  DELETE: "method-delete",
};

export function ApiRoute({
  method,
  path,
  children,
}: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  children?: ReactNode;
}) {
  return (
    <section className="api-route">
      <div className="api-route-heading">
        <span className={`method-badge ${METHOD_CLASS[method]}`}>{method}</span>
        <code>{path}</code>
      </div>
      {children}
    </section>
  );
}
