import type { CapacitorConfig } from '@capacitor/cli';

const isProduction = process.env.NODE_ENV === 'production' || process.env.CAPACITOR_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'com.rootforge.aisolutionbuilder',
  appName: 'AI Solution Builder',
  webDir: 'frontend/dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: isProduction ? 'https' : 'http',
    // In production, cleartext is disabled and all communication uses authenticated HTTPS.
    // In local development, cleartext allows connecting to local network test endpoints.
    cleartext: !isProduction,
  },
  android: {
    // Disable mixed content and remote debugging in production builds
    allowMixedContent: !isProduction,
    captureInput: true,
    webContentsDebuggingEnabled: !isProduction,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 300,
      launchAutoHide: true,
      backgroundColor: '#0B0F17',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B0F17',
      overlaysWebView: false,
    },
  },
};

export default config;
