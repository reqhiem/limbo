import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  // Let OPTIONS on /h/* reach the Worker in dev instead of Vite's CORS middleware.
  server: { cors: false },
});
