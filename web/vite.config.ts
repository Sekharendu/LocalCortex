import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The UI calls /api/*, proxied to the Express API. One origin means the browser can
// read the X-Citations header without any CORS setup on the server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.API_URL ?? "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
