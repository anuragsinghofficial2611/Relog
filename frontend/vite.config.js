import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  server: {
    proxy: {
      "/api": process.env.VITE_API_URL || "http://localhost:8000",
      "/health": process.env.VITE_API_URL || "http://localhost:8000",
    },
  },
});
