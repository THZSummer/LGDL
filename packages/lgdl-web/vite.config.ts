import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 部署在子路径 /LGDL/ 下；本地开发用默认根路径
const base = process.env.GH_PAGES ? '/LGDL/' : '/';

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});
