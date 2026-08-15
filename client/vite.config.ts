import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@panjat/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/ws": {
        target: "http://localhost:2567",
        changeOrigin: true,
        ws: true,
        rewrite: (p) => p.replace(/^\/ws/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
