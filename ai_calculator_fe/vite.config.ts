import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  base: '/', // Adjust the base path if necessary (e.g., '/your-subfolder/')
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/calculate': 'http://localhost:8900',
    },
  },
  build: {
    outDir: 'dist', // Ensure the output is going to the right folder
  },
})