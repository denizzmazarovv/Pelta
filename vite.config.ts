import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { seoPages } from './scripts/seo-pages';

export default defineConfig({
  // seoPages — готовые страницы для поисковиков, sitemap.xml и robots.txt (после сборки)
  plugins: [react(), seoPages()],
});
