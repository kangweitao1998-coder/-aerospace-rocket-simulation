import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: process.env.CI ? '/-aerospace-rocket-simulation/' : './',
  server: {
    port: 5173,
    open: true
  }
})
