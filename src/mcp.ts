import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createMcpServer } from "./mcp/server.js";

// stdout belongs exclusively to MCP JSON-RPC; diagnostics go to stderr.
console.log = console.error.bind(console);
serveStdio(() => createMcpServer());
