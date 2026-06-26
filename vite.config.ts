import { defineConfig } from 'vite';

// Tauri exposes the dev host through this env var when targeting a physical
// device; otherwise we bind to localhost.
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  // Prevent Vite from clobbering the Rust compiler output in the terminal.
  clearScreen: false,
  server: {
    // Tauri requires a fixed, predictable port.
    port: 1420,
    strictPort: true,
    host: host ?? false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // The Rust side is rebuilt by `cargo`, so Vite should ignore it.
      ignored: ['**/src-tauri/**'],
    },
  },
  // Produce a lean, modern bundle. Vite 8 transpiles/minifies with Oxc
  // (via Rolldown) — no separate esbuild install required.
  build: {
    target: 'es2022',
    minify: 'oxc',
    sourcemap: false,
  },
});
