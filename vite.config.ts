import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { seoPages } from './scripts/seo-pages';
import { securityHeaders } from './scripts/security';

export default defineConfig({
  // securityHeaders — правила безопасности (CSP) в <head> каждой страницы
  // seoPages — готовые страницы для поисковиков, sitemap.xml и robots.txt (после сборки)
  plugins: [react(), securityHeaders(), seoPages()],
});
