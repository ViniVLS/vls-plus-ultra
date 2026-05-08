import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * TypeScript interface for the native MediaControls Capacitor plugin.
 * Bridges Angular's AudioService with Android's MediaPlaybackService
 * for background audio playback and notification controls.
 */
export interface MediaControlsPlugin {
  startService(options: {
    title: string;
    artist: string;
    artwork?: string;
    isPlaying: boolean;
  }): Promise<void>;

  updateMetadata(options: {
    title: string;
    artist: string;
    artwork?: string;
    isPlaying: boolean;
  }): Promise<void>;

  updatePlayState(options: { isPlaying: boolean }): Promise<void>;

  stopService(): Promise<void>;

  addListener(
    eventName: 'mediaAction',
    listenerFunc: (event: { action: string }) => void
  ): Promise<{ remove: () => void }>;
}

const MediaControls = registerPlugin<MediaControlsPlugin>('MediaControls');

@Injectable({
  providedIn: 'root'
})
export class MediaControlsService {
  private isNative = Capacitor.isNativePlatform();
  private isServiceRunning = false;
  private actionCallback: ((action: string) => void) | null = null;
  private listenerHandle: { remove: () => void } | null = null;

  constructor() {
    if (this.isNative) {
      this.setupNativeListeners();
    }
  }

  /**
   * Register a callback to receive media button actions
   * (play, pause, next, previous, stop) from the notification.
   */
  onAction(callback: (action: string) => void) {
    this.actionCallback = callback;
  }

  /**
   * Start the foreground service with initial metadata.
   * Call this when playback starts.
   */
  async startService(title: string, artist: string, artwork?: string) {
    if (this.isNative) {
      try {
        await MediaControls.startService({
          title: title || 'VLS PLUS',
          artist: artist || '',
          artwork: artwork || '',
          isPlaying: true
        });
        this.isServiceRunning = true;
      } catch (e) {
        console.warn('MediaControls: Failed to start service', e);
      }
    }

    // Also set Web Media Session API (works in modern browsers/WebViews)
    this.updateWebMediaSession(title, artist, artwork);
  }

  /**
   * Update metadata (title, artist, artwork) while service is running.
   */
  async updateMetadata(title: string, artist: string, artwork?: string, isPlaying: boolean = true) {
    if (this.isNative && this.isServiceRunning) {
      try {
        await MediaControls.updateMetadata({
          title: title || 'VLS PLUS',
          artist: artist || '',
          artwork: artwork || '',
          isPlaying
        });
      } catch (e) {
        console.warn('MediaControls: Failed to update metadata', e);
      }
    }

    this.updateWebMediaSession(title, artist, artwork);
  }

  /**
   * Update play/pause state on the notification.
   */
  async updatePlayState(isPlaying: boolean) {
    if (this.isNative && this.isServiceRunning) {
      try {
        await MediaControls.updatePlayState({ isPlaying });
      } catch (e) {
        console.warn('MediaControls: Failed to update play state', e);
      }
    }

    // Update Web Media Session state
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }

  /**
   * Stop the foreground service. Call when playback is fully stopped.
   */
  async stopService() {
    if (this.isNative && this.isServiceRunning) {
      try {
        await MediaControls.stopService();
        this.isServiceRunning = false;
      } catch (e) {
        console.warn('MediaControls: Failed to stop service', e);
      }
    }
  }

  /**
   * Setup listeners for native media button actions.
   */
  private async setupNativeListeners() {
    try {
      this.listenerHandle = await MediaControls.addListener('mediaAction', (event) => {
        console.log('MediaControls: Native action received:', event.action);
        if (this.actionCallback) {
          this.actionCallback(event.action);
        }
      });
    } catch (e) {
      console.warn('MediaControls: Failed to setup listeners', e);
    }
  }

  /**
   * Update the Web Media Session API (for Chrome/WebView media controls).
   * This provides a fallback for the notification on some devices.
   */
  private updateWebMediaSession(title: string, artist: string, artwork?: string) {
    if (!('mediaSession' in navigator)) return;

    try {
      const artworkArray: MediaImage[] = [];
      if (artwork && artwork.startsWith('data:')) {
        artworkArray.push({
          src: artwork,
          sizes: '512x512',
          type: 'image/png'
        });
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'VLS PLUS',
        artist: artist || '',
        album: 'VLS PLUS',
        artwork: artworkArray.length > 0 ? artworkArray : [
          { src: '/favicon.png', sizes: '512x512', type: 'image/png' }
        ]
      });
    } catch (e) {
      console.warn('MediaSession: Failed to set metadata', e);
    }
  }

  /**
   * Setup Web Media Session action handlers.
   * Call this once during initialization.
   */
  setupWebMediaSessionActions(handlers: {
    play: () => void;
    pause: () => void;
    next: () => void;
    previous: () => void;
    stop?: () => void;
  }) {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', handlers.play);
      navigator.mediaSession.setActionHandler('pause', handlers.pause);
      navigator.mediaSession.setActionHandler('nexttrack', handlers.next);
      navigator.mediaSession.setActionHandler('previoustrack', handlers.previous);
      if (handlers.stop) {
        navigator.mediaSession.setActionHandler('stop', handlers.stop);
      }
    } catch (e) {
      console.warn('MediaSession: Failed to setup action handlers', e);
    }
  }
}
