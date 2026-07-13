/// <reference types="vite/client" />

// Vite 默认支持 JSON 静态导入
declare module '*.json' {
  const value: unknown;
  export default value;
}

// 自定义 Vite 环境变量
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
