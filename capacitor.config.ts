import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dinboard.app',
  appName: 'DinBoard',
  webDir: 'dist',
  bundledWebRuntime: false,
  // WHY: konfiguracja SplashScreen — wcześniej była domyślna Capacitora
  // (stock placeholder + auto-hide po ~500ms). Teraz używa zbrandbizowanego
  // splasha (granat #0e0f11 + logo DIN) z 2s widoczności i ręcznym
  // ukrywaniem przez SplashScreen.hide() w AppLayout.useEffect, gdy React
  // zahydratuje. launchAutoHide: true = safety net — gdyby JS się zawiesił,
  // splash i tak zniknie po launchShowDuration.
  plugins: {
    SplashScreen: {
      launchShowDuration: 6000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#0e0f11',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
};

export default config;
