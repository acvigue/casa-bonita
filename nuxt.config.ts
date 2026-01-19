import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/icon',
    '@nuxt/hints',
    '@nuxt/fonts',
    '@nuxt/eslint',
    '@nuxt/a11y',
  ],

  alias: {
    '#server': fileURLToPath(new URL('./server', import.meta.url)),
  },

  // Runtime config for Home Assistant connection
  runtimeConfig: {
    // Server-only config
    jwtSecret: process.env.JWT_SECRET || '',
    supervisorToken: process.env.SUPERVISOR_TOKEN || '',

    homeAssistant: {
      url: process.env.HOMEASSISTANT_URL || 'http://supervisor/core/api',
      wsUrl: process.env.HOMEASSISTANT_WS_URL || 'ws://supervisor/core/websocket',
      token: process.env.HOMEASSISTANT_TOKEN || '',
    },

    public: {
      // Public runtime config (exposed to client)
      appName: 'Casa Bonita',
    },
  },

  // Nitro server configuration
  nitro: {
    // Externalize Prisma - it can't be bundled
    externals: {
      external: ['@prisma/client'],
    },
  },
})