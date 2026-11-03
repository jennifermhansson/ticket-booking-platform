import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // The Docker build sets the cdn URL, so the page on <domain> loads its assets
  // from cdn.<domain> (ADR 0016). Dev and the e2e build keep them same-origin.
  base: process.env.ASSET_BASE_URL ?? '/',
})
