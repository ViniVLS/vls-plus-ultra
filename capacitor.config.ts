import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vlsplus.player',
  appName: 'VLS PLUS',
  webDir: 'dist/player',
  android: {
    // Keep the WebView running when the app goes to background
    // This is critical for audio playback to continue
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    // Ensure the app doesn't get suspended when in background
  }
};

export default config;
