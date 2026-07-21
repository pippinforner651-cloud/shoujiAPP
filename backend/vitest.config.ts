import { defineConfig } from 'vitest/config';

// 后端独立 vitest 配置：隔离仓库根目录 vite.config.ts（React 插件等前端配置），
// 避免在 backend/ 下运行测试时误加载前端构建链。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
