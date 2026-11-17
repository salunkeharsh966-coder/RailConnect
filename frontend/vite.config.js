import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
//
// The dev server proxies /api to the Spring Boot backend so the browser sees a
// single origin and CORS never appears in development. The backend port is
// 8080 by default; change `target` here (and `server.port` in the backend's
// application.properties) if your backend runs elsewhere.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
