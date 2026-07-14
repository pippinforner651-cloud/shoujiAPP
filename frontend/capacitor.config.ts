import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.e23running.app',
  appName: 'E23跑起来',
  webDir: 'dist',
  version: '1.0.1',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#0D2B45',
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
    backgroundColor: '#0D2B45',
  },
};

export default config;
