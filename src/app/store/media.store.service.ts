import { Injectable } from '@angular/core';
import { MediaStore, MediaState } from './media.state';

@Injectable({
  providedIn: 'root'
})
export class MediaStoreService {
  private store = new MediaStore();

  // Expose state signals
  readonly isPlaying = this.store.isPlaying;
  readonly currentTime = this.store.currentTime;
  readonly duration = this.store.duration;
  readonly volume = this.store.volume;
  readonly isMuted = this.store.isMuted;
  readonly playbackRate = this.store.playbackRate;

  // Expose setter methods
  setIsPlaying(isPlaying: boolean) {
    this.store.setIsPlaying(isPlaying);
  }

  setCurrentTime(currentTime: number) {
    this.store.setCurrentTime(currentTime);
  }

  setDuration(duration: number) {
    this.store.setDuration(duration);
  }

  setVolume(volume: number) {
    this.store.setVolume(volume);
  }

  setIsMuted(isMuted: boolean) {
    this.store.setIsMuted(isMuted);
  }

  setPlaybackRate(playbackRate: number) {
    this.store.setPlaybackRate(playbackRate);
  }

  // Convenience methods
  togglePlay() {
    this.store.setIsPlaying(!this.store.isPlaying());
  }

  reset() {
    this.store.reset();
  }

  // Get current state as object
  getState(): MediaState {
    return {
      isPlaying: this.store.isPlaying(),
      currentTime: this.store.currentTime(),
      duration: this.store.duration(),
      volume: this.store.volume(),
      isMuted: this.store.isMuted(),
      playbackRate: this.store.playbackRate()
    };
  }
}