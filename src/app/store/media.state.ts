import { signal, computed } from '@angular/core';

export interface MediaState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
}

export class MediaStore {
  private state = signal<MediaState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    playbackRate: 1
  });

  // Getters - expose computed signals for individual properties
  readonly isPlaying = computed(() => this.state().isPlaying);
  readonly currentTime = computed(() => this.state().currentTime);
  readonly duration = computed(() => this.state().duration);
  readonly volume = computed(() => this.state().volume);
  readonly isMuted = computed(() => this.state().isMuted);
  readonly playbackRate = computed(() => this.state().playbackRate);

  // Setters
  setIsPlaying(isPlaying: boolean) {
    this.state.update(state => ({ ...state, isPlaying }));
  }

  setCurrentTime(currentTime: number) {
    this.state.update(state => ({ ...state, currentTime }));
  }

  setDuration(duration: number) {
    this.state.update(state => ({ ...state, duration }));
  }

  setVolume(volume: number) {
    this.state.update(state => ({ ...state, volume }));
  }

  setIsMuted(isMuted: boolean) {
    this.state.update(state => ({ ...state, isMuted }));
  }

  setPlaybackRate(playbackRate: number) {
    this.state.update(state => ({ ...state, playbackRate }));
  }

  // Reset to initial state
  reset() {
    this.state.set({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      isMuted: false,
      playbackRate: 1
    });
  }
}