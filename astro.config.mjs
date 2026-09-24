// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // 用户主页仓库（user.github.io），base 必须保持默认 '/'
  site: 'https://zhuruoling.github.io',
  output: 'static',
  build: {
    // 产出 /blog/hello/index.html 形式，GH Pages 天然支持
    format: 'directory',
  },
  markdown: {
    shikiConfig: {
      // 双主题：light 走 CSS 变量，dark 用默认色。
      // 配合 global.css 里的 prefers-color-scheme 生效。
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: false,
      defaultColor: false,
    },
  },
  vite: {
    server: {
      host: '0.0.0.0',
    },
  },
});
