import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 子路径部署：Actions 注入 VITE_BASE_PATH=/shoujiAPP/；本地默认相对路径（子路径不白屏）
  base: process.env.VITE_BASE_PATH ?? './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
