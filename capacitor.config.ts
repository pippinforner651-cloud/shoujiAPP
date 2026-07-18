import type { CapacitorConfig } from '@capacitor/cli';

// E23跑起来 · Capacitor 配置
// 构建 APK 前：npm install @capacitor/core @capacitor/cli @capacitor/android
// 然后：npm run cap:add:android（首次）→ npm run apk:debug
// Web 与 APK 必须同一 Commit：先 npm run build 生成 dist，再 npx cap sync
// 注意：正式包名 com.e23running.app 不在本预览版使用，待正式版单独迁移确认
const config: CapacitorConfig = {
  appId: 'com.e23running.app.kimi.preview',
  appName: 'E23跑起来 Kimi预览版',
  webDir: 'dist',
  backgroundColor: '#F4F8F6',
  android: {
    // 允许 GPS 前台定位（后台锁屏 GPS 为后续原生开发项，见 docs/风险清单.md）
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#FF6B1A',
      showSpinner: false,
    },
  },
};

export default config;
