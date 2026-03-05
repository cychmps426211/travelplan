import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 使用 generateSW 自動產生 Service Worker，含 precache 所有靜態資源
      strategies: 'generateSW',
      workbox: {
        // 預快取所有這些格式的靜態檔案（build 後的 JS/CSS/HTML/圖片/字體）
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
        // 允許預快取較大的 bundle（預設 2MB，提高到 5MB）
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Runtime caching：Firebase API 呼叫用 NetworkFirst（先網路再快取）
        runtimeCaching: [
          {
            // Firebase Auth REST API
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-auth-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Firebase Firestore REST API
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-firestore-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Google user profile images
            urlPattern: /^https:\/\/lh3\.googleusercontent\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-profile-images',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      // PWA Manifest（取代原本手動的 manifest.json）
      manifest: {
        name: 'Travel Plan',
        short_name: 'Travel Plan',
        description: 'A progressive web app for travel planning',
        start_url: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'travel.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'travel.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'travel.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  base: '/travelplan/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
})

