/// <reference types="astro/client" />

declare global {
  interface Window {
    /** 由 BaseLayout 的 inline boot 脚本创建，供 background.ts 认领 */
    __bgCanvas?: HTMLCanvasElement;
  }
}

export {};
