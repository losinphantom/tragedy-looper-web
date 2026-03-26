import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react() as any],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('/packages/domain/src/data/')) {
            return 'tragedy-domain-data';
          }
          if (normalizedId.includes('/packages/domain/src/modules/')) {
            return 'tragedy-domain-modules';
          }
          if (normalizedId.includes('/packages/domain/')) {
            return 'tragedy-domain-core';
          }
          if (normalizedId.includes('/packages/game-logic/')) {
            return 'tragedy-game-logic';
          }
          if (normalizedId.includes('/packages/rules/')) {
            return 'tragedy-rules';
          }
          if (normalizedId.includes('/node_modules/')) {
            if (
              normalizedId.includes('/node_modules/react/')
              || normalizedId.includes('/node_modules/react-dom/')
              || normalizedId.includes('/node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (
              normalizedId.includes('/node_modules/boardgame.io/')
              || normalizedId.includes('/node_modules/socket.io-client/')
              || normalizedId.includes('/node_modules/engine.io-client/')
              || normalizedId.includes('/node_modules/engine.io-parser/')
              || normalizedId.includes('/node_modules/component-emitter/')
            ) {
              return 'vendor-boardgame';
            }
            if (
              normalizedId.includes('/node_modules/@radix-ui/')
              || normalizedId.includes('/node_modules/@dnd-kit/')
              || normalizedId.includes('/node_modules/framer-motion/')
              || normalizedId.includes('/node_modules/@floating-ui/')
              || normalizedId.includes('/node_modules/sonner/')
            ) {
              return 'vendor-ui';
            }
            return 'vendor-misc';
          }

          return undefined;
        },
      },
    },
  },
})
