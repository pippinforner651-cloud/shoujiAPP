/// <reference types="vite/client" />

// Vite 默认支持 JSON 静态导入
declare module '*.json' {
  const value: unknown;
  export default value;
}
