import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: process.env.TAURI_DEBUG ? false : "esbuild",
    sourcemap: Boolean(process.env.TAURI_DEBUG),
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            "codemirror",
            "@codemirror/lang-markdown",
            "@codemirror/state",
            "@codemirror/view"
          ],
          markdown: [
            "unified",
            "remark-parse",
            "remark-gfm",
            "remark-directive",
            "remark-rehype",
            "rehype-raw",
            "rehype-stringify",
            "unist-util-visit"
          ],
          tauri: ["@tauri-apps/api"]
        }
      }
    }
  }
});
