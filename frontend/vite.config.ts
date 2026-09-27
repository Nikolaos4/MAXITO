import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Одно приложение на обе роли — какое дерево компонентов рендерить
// (житель/диспетчер), решает Root.tsx по start_param диплинка или по /me.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: { "/api": "http://localhost:8080" },
  },
});
