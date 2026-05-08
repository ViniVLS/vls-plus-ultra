import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { MediaStoreService } from '../../store/media.store.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss']
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @Input() videoId: string = '';
  @Input() userId: string = 'current-user'; // In real app, this would come from auth

  // Video element reference
  videoElement: HTMLVideoElement | null = null;

  // Expose mediaStore to template
  mediaStore: MediaStoreService;

  // Progress tracking
  private progressUpdateInterval: any = null;
  private lastReportedProgress: number = 0;

  constructor(
    private _mediaStore: MediaStoreService,
    private supabaseService: SupabaseService
  ) {
    this.mediaStore = _mediaStore;
  }

  ngOnInit(): void {
    // Load saved progress if available
    this.loadSavedProgress();
  }

  ngOnDestroy(): void {
    this.stopProgressTracking();
  }

  // Video element reference
  onVideoReady(video: HTMLVideoElement): void {
    this.videoElement = video;
    
    // Set up event listeners
    this.videoElement.addEventListener('timeupdate', this.onTimeUpdate.bind(this));
    this.videoElement.addEventListener('ended', this.onVideoEnded.bind(this));
    this.videoElement.addEventListener('play', this.onVideoPlay.bind(this));
    this.videoElement.addEventListener('pause', this.onVideoPause.bind(this));
    
    // Start progress tracking for Supabase sync
    this.startProgressTracking();
  }

  private onTimeUpdate(): void {
    if (!this.videoElement) return;
    
    // Update media store with current time
    this.mediaStore.setCurrentTime(this.videoElement.currentTime);
    
    // Update duration if available
    if (this.videoElement.duration > 0) {
      this.mediaStore.setDuration(this.videoElement.duration);
    }
  }

  private onVideoEnded(): void {
    this.mediaStore.setIsPlaying(false);
    this.mediaStore.setCurrentTime(0);
    
    // Stop progress tracking when video ends
    this.stopProgressTracking();
  }

  private onVideoPlay(): void {
    this.mediaStore.setIsPlaying(true);
    
    // Start progress tracking when video plays
    this.startProgressTracking();
  }

  private onVideoPause(): void {
    this.mediaStore.setIsPlaying(false);
    
    // Stop progress tracking when video pauses
    this.stopProgressTracking();
  }

  // Controls
  togglePlayPause(): void {
    this.mediaStore.togglePlay();
  }

  setVolume(volume: number): void {
    this.mediaStore.setVolume(volume);
  }

  onVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.setVolume(parseFloat(target.value));
  }

  setMute(muted: boolean): void {
    this.mediaStore.setIsMuted(muted);
  }

  setPlaybackRate(rate: number): void {
    this.mediaStore.setPlaybackRate(rate);
  }

  seekTo(time: number): void {
    this.mediaStore.setCurrentTime(time);
  }

  toggleFullscreen(): void {
    if (!this.videoElement) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.videoElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  }

  // Progress tracking for Supabase sync
  private startProgressTracking(): void {
    // Update progress every 10 seconds
    this.progressUpdateInterval = setInterval(() => {
      this.reportProgress();
    }, 10000);
  }

  private stopProgressTracking(): void {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = null;
    }
  }

  private reportProgress(): void {
    if (!this.videoElement || !this.userId || !this.videoId) return;
    
    const progress = this.videoElement.currentTime;
    
    // Only report if progress has changed significantly (>10 seconds)
    if (Math.abs(progress - this.lastReportedProgress) > 10) {
      this.supabaseService.updateVideoProgress(
        this.userId,
        this.videoId,
        progress
      ).then(() => {
        this.lastReportedProgress = progress;
      }).catch((error: any) => {
        console.error('Failed to update video progress:', error);
      });
    }
  }

  private async loadSavedProgress(): Promise<void> {
    if (!this.userId || !this.videoId) return;
    
    try {
      const progressData = await this.supabaseService.getVideoProgress(
        this.userId,
        this.videoId
      );
      
      if (progressData && progressData.progress > 0) {
        // Ask user if they want to resume
        // For now, we'll auto-resume if progress is > 5 seconds
        if (progressData.progress > 5) {
          this.mediaStore.setCurrentTime(progressData.progress);
        }
      }
    } catch (error) {
      console.error('Failed to load video progress:', error);
    }
  }

  // Format time helper
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}