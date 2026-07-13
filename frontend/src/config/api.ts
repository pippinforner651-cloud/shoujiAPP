/**
 * API 配置
 *
 * Phase 6.3.2 — 统一 API 地址管理
 * - 开发环境: VITE_API_BASE_URL 未设置 → 使用 localhost:3001
 * - 生产环境: VITE_API_BASE_URL 由构建时注入 → 指向 Render HTTPS API
 * - APK 内: 构建时已固定，不会写死 localhost
 */

/** API 基础地址 */
export const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:3001';

/** 是否为生产环境 */
export const IS_PRODUCTION: boolean =
  (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'production') ||
  !API_BASE_URL.includes('localhost');

/** 请求超时时间（毫秒） */
export const REQUEST_TIMEOUT = 10000;

/** 构建信息 */
export const BUILD_INFO = {
  apiBaseUrl: API_BASE_URL,
  isProduction: IS_PRODUCTION,
  buildTime: new Date().toISOString(),
};
