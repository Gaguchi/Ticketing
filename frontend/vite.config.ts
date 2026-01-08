import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core
          if (id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          // Ant Design core
          if (id.includes('node_modules/antd/')) {
            return 'vendor-antd-core';
          }
          // Ant Design icons
          if (id.includes('@ant-design/icons')) {
            return 'vendor-antd-icons';
          }
          // DnD Kit
          if (id.includes('@dnd-kit/')) {
            return 'vendor-dnd';
          }
          // TipTap editor
          if (id.includes('@tiptap/')) {
            return 'vendor-editor';
          }
          // FontAwesome
          if (id.includes('@fortawesome/')) {
            return 'vendor-icons';
          }
          // Calendar
          if (id.includes('react-big-calendar')) {
            return 'vendor-calendar';
          }
        },
      },
    },
  },
})
