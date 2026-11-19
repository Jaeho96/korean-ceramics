import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// 페이지 두 개: 사이트(index.html)와 에셋 확인용 뷰어(viewer.html)
// base './': 파일 경로를 상대 경로로 만들어, 도메인 맨 앞이 아닌 하위 경로(예: GitHub Pages /저장소/)에 올려도 열리게 한다
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), viewer: resolve(import.meta.dirname, 'viewer.html') },
    },
  },
});
