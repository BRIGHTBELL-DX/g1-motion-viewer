import { defineConfig } from 'vite'

export default defineConfig({
  base: './',   // relative paths → GitHub Pages subdirectory 배포 정상 작동
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
