import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8080",
      "/ap": "http://localhost:8080",
      "/feed": "http://localhost:8080",
    },
  }
});
