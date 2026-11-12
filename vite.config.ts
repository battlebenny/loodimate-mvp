/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { apiPlugin } from './dev/api-plugin'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    apiPlugin(mode),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'mate.svg'],
      manifest: {
        name: 'Loodi-mate',
        short_name: 'Mate',
        description: 'Garde la trace de tes parties de jeux de société.',
        lang: 'fr',
        display: 'standalone',
        start_url: '/',
        theme_color: '#2E8B57',
        background_color: '#fafaf8',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
}))
