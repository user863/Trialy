import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: "es" },
  server: { host: "127.0.0.1", port: Number(process.env.PORT ?? 5173), allowedHosts: [".ts.net"] },
  preview: { host: "127.0.0.1", port: Number(process.env.PREVIEW_PORT ?? 4173), allowedHosts: [".ts.net"] },
  build: { target: "es2022" }
})
