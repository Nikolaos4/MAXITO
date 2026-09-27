import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Два мини-аппа в одном проекте: index.html — житель, dispatcher.html — диспетчер.
// В dev-режиме оба доступны сразу: http://localhost:5173/ и http://localhost:5173/dispatcher.html
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: { "/api": "http://localhost:8080" },
  },
  build: {
    rollupOptions: {
      // Пути — относительно корня проекта (см. https://vite.dev/guide/build.html#multi-page-app)
      input: {
        resident: "index.html",
        dispatcher: "dispatcher.html",
      },
    },
  },
});
