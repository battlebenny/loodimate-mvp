import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Icons are generated from a full-bleed green source (Mate module accent).
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#2E8B57' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#2E8B57' } },
  },
  images: ['public/icon-source.svg'],
})
