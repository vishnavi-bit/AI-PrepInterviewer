import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The browser talks to the Vite dev server; /api is forwarded to the FastAPI backend,
// so the session cookie is same-origin and HTTP-only.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
