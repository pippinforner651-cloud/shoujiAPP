import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chinarun.app',
  appName: '全民环游中国',
  webDir: 'dist',
  version: '1.0.0',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: '#0f2027',
      androidScaleType: 'CENTER_CROP',
      androidSplashResourceName: 'splash',
    },
    Geolocation: {
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
      ],
    },
  },
  android: {
    backgroundColor: '#0f2027',
  },
};

export default config;
