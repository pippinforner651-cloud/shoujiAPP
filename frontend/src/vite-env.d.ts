/// <reference types="vite/client" />

// Vite 默认支持 JSON 静态导入
declare module '*.json' {
  const value: unknown;
  export default value;
}

// 自定义 Vite 环境变量
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_BUILD_VARIANT?: 'v1' | 'v2-preview';
  readonly VITE_APP_VERSION_LABEL?: string;
  readonly VITE_MULTIPLAYER_MODE?: 'v1-backend' | 'v2-backend' | 'disabled';
  readonly VITE_E23_EVENT_ID?: string;
  readonly MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
