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
          // React must be in its own chunk and load first
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // React Router separate
          if (id.includes('react-router')) {
            return 'vendor-router';
          }
          // Ant Design + icons together (icons depend on React context)
          if (id.includes('node_modules/antd/') || id.includes('@ant-design/')) {
            return 'vendor-antd';
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
