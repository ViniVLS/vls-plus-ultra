import { Injectable, signal, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { EqualizerService } from '../equalizer/equalizer.service';
import { AuthService } from './auth.service';
import { MediaControlsService } from './media-controls.service';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audio: HTMLAudioElement = new Audio();
  public audioContext: AudioContext | null = null;
  public isEqualizerActive: boolean = false;
  
  currentTracks = signal<any[]>([]); 
  recentTracks = signal<any[]>([]);
  currentTrackIndex = signal<number>(0);
  currentTrackArt = signal<string | null>(null);
  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  
  constructor(
    private supabase: SupabaseService,
    private authService: AuthService,
    private equalizer: EqualizerService,
    private mediaControls: MediaControlsService,
    private db: DatabaseService
  ) {
    this.audio.ontimeupdate = () => {
      this.currentTime.set(this.audio.currentTime);
    };
    
    this.audio.onloadedmetadata = () => {
      this.duration.set(this.audio.duration);
    };
    
    this.audio.onended = () => {
      this.next();
    };

    this.audio.onplay = () => {
      this.isPlaying.set(true);
      this.mediaControls.updatePlayState(true);
    };

    this.audio.onpause = () => {
      this.isPlaying.set(false);
      this.mediaControls.updatePlayState(false);
    };

    // Efeito para parar a música se o usuário sair
    effect(() => {
      const user = this.authService.user();
      if (!user) {
        this.stop();
      }
    }, { allowSignalWrites: true });

    // Setup media notification button handlers
    this.setupMediaControls();
    this.loadRecentTracks();
  }

  private async loadRecentTracks() {
    const data = await this.db.get('settings', 'recent_tracks');
    if (data && data.data) {
      this.recentTracks.set(data.data);
    }
  }

  private async addToRecentTracks(track: any) {
    if (!track) return;
    const currentList = [...this.recentTracks()];
    // Check by name and duration to avoid duplicates
    const existingIdx = currentList.findIndex(t => t.name === track.name);
    if (existingIdx !== -1) {
      currentList.splice(existingIdx, 1);
    }
    
    // Save only metadata, not the File object
    const trackMeta = {
      name: track.name,
      artist: track.artist || this.extractArtist(track),
      duration: track.duration,
      size: track.size,
      nativeUrl: track.nativeUrl || undefined,
      playedAt: Date.now()
    };
    
    currentList.unshift(trackMeta);
    if (currentList.length > 50) currentList.pop();
    
    this.recentTracks.set(currentList);
    await this.db.set('settings', { key: 'recent_tracks', data: currentList });
  }

  /**
   * Configure media notification button handlers.
   * When user taps play/pause/next/previous on the Android notification,
   * these handlers execute the corresponding action.
   */
  private setupMediaControls() {
    // Native plugin handler (Android foreground service)
    this.mediaControls.onAction((action: string) => {
      switch (action) {
        case 'play':
          this.play();
          break;
        case 'pause':
          this.pause();
          break;
        case 'next':
          this.next();
          break;
        case 'previous':
          this.previous();
          break;
        case 'stop':
          this.stop();
          this.mediaControls.stopService();
          break;
      }
    });

    // Web Media Session API handler (fallback / Chrome)
    this.mediaControls.setupWebMediaSessionActions({
      play: () => this.play(),
      pause: () => this.pause(),
      next: () => this.next(),
      previous: () => this.previous(),
      stop: () => {
        this.stop();
        this.mediaControls.stopService();
      }
    });
  }

  /**
   * Update the media notification with current track info.
   */
  private updateMediaNotification() {
    const tracks = this.currentTracks();
    const index = this.currentTrackIndex();
    const track = tracks[index];

    if (!track) return;

    // Clean the filename for display
    const title = this.cleanTrackName(track.name);
    const artist = this.extractArtist(track);
    const artwork = this.currentTrackArt() || undefined;

    // Start or update the foreground service notification
    if (!this.isPlaying()) {
      this.mediaControls.startService(title, artist, artwork);
    } else {
      this.mediaControls.updateMetadata(title, artist, artwork, this.isPlaying());
    }
  }

  /**
   * Clean a filename to a readable track name.
   * Removes extension and common prefixes.
   */
  private cleanTrackName(filename: string): string {
    if (!filename) return 'Faixa Desconhecida';
    // Remove file extension
    return filename.replace(/\.(mp3|m4a|flac|wav|ogg|aac|wma)$/i, '').trim();
  }

  /**
   * Extract artist from track metadata if available.
   */
  private extractArtist(track: any): string {
    if (track.artist) return track.artist;
    // Try to extract from filename pattern "Artist - Title"
    const name = this.cleanTrackName(track.name);
    const parts = name.split(' - ');
    if (parts.length >= 2) {
      return parts[0].trim();
    }
    return '';
  }

  async setTracks(tracks: any[], index: number = 0) {
    const currentTracks = this.currentTracks();
    
    // Evitar recarregar se for exatamente a mesma lista
    if (currentTracks.length > 0 && tracks.length === currentTracks.length) {
      const isSame = tracks.slice(0, 5).every((t, i) => t.name === currentTracks[i].name && t.size === currentTracks[i].size);
      if (isSame) return;
    }

    // Carregamento paralelo limitado para evitar travar o navegador
    const tracksWithMetadata = [];
    const batchSize = 5;
    
    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async (file) => {
        const hasDuration = typeof file.duration === 'number' && file.duration > 0;
        const duration = hasDuration ? file.duration : await this.getDuration(file);
        return {
          file: file instanceof File ? file : undefined,
          name: file.name,
          size: file.size,
          nativeUrl: file.nativeUrl || undefined,
          duration: duration
        };
      }));
      tracksWithMetadata.push(...results);
    }
    
    this.currentTracks.set(tracksWithMetadata);
    this.selectTrack(index);
  }

  private getDuration(file: any): Promise<number> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio();
        let url = '';
        if (file instanceof File) {
          url = URL.createObjectURL(file);
        } else if (file && file.nativeUrl) {
          url = file.nativeUrl;
        } else {
          resolve(0);
          return;
        }
        audio.src = url;
        audio.onloadedmetadata = () => {
          if (file instanceof File) {
            URL.revokeObjectURL(url);
          }
          resolve(audio.duration);
        };
        audio.onerror = () => {
          if (file instanceof File) {
            URL.revokeObjectURL(url);
          }
          resolve(0);
        };
        // Timeout de segurança para não travar
        setTimeout(() => {
          if (file instanceof File) {
            URL.revokeObjectURL(url);
          }
          resolve(0);
        }, 5000);
      } catch (e) {
        resolve(0);
      }
    });
  }

  private loadTrack(index: number) {
    const tracks = this.currentTracks();
    const trackObj = tracks[index];
    
    if (trackObj) {
      if (trackObj.file) {
        // Limpeza segura de URLs antigas
        if (this.audio.src && this.audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(this.audio.src);
        }
        
        this.audio.src = URL.createObjectURL(trackObj.file);
        this.extractMetadata(trackObj.file);
      } else if (trackObj.nativeUrl) {
        this.audio.src = trackObj.nativeUrl;
        this.updateMediaNotification();
      } else {
        return;
      }
      
      this.audio.load();
      this.addToRecentTracks(trackObj);
    }
  }

  private extractMetadata(file: File) {
    this.currentTrackArt.set(null);
    const jsmediatags = (window as any).jsmediatags;
    if (jsmediatags && file instanceof File) {
      jsmediatags.read(file, {
        onSuccess: (tag: any) => {
          const picture = tag.tags.picture;
          if (picture) {
            const { data, format } = picture;
            let base64String = "";
            for (let i = 0; i < data.length; i++) {
              base64String += String.fromCharCode(data[i]);
            }
            const artUrl = `data:${format};base64,${window.btoa(base64String)}`;
            this.currentTrackArt.set(artUrl);
          }

          // Store extracted metadata on the track object
          const tracks = this.currentTracks();
          const index = this.currentTrackIndex();
          if (tracks[index]) {
            if (tag.tags.title) tracks[index].title = tag.tags.title;
            if (tag.tags.artist) tracks[index].artist = tag.tags.artist;
          }

          // Update notification with metadata (title, artist, artwork)
          this.updateMediaNotification();
        },
        onError: (error: any) => {
          console.warn('Metadata extraction error:', error);
          // Still update notification with filename
          this.updateMediaNotification();
        }
      });
    } else {
      // No jsmediatags available, update with filename only
      this.updateMediaNotification();
    }
  }

  play() {
    if (this.currentTracks().length === 0) return;
    if (!this.audio.src) {
      this.loadTrack(this.currentTrackIndex());
    }
    
    // Resumir o context do equalizador se necessário
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    this.audio.play().catch(err => {
      console.warn('Playback failed:', err);
    });
  }

  pause() {
    this.audio.pause();
  }

  togglePlayPause() {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying.set(false);
    this.mediaControls.stopService();
  }

  next() {
    const tracks = this.currentTracks();
    if (tracks.length === 0) return;
    const nextIndex = (this.currentTrackIndex() + 1) % tracks.length;
    this.currentTrackIndex.set(nextIndex);
    this.loadTrack(nextIndex);
    this.play();
  }

  previous() {
    const tracks = this.currentTracks();
    if (tracks.length === 0) return;
    const prevIndex = (this.currentTrackIndex() - 1 + tracks.length) % tracks.length;
    this.currentTrackIndex.set(prevIndex);
    this.loadTrack(prevIndex);
    this.play();
  }

  seek(time: number | any) {
    // Garantir que recebemos um número (do evento input ou direto)
    const val = typeof time === 'object' ? parseFloat(time.target.value) : time;
    if (!isNaN(val)) {
      this.audio.currentTime = val;
    }
  }

  selectTrack(index: number) {
    const tracks = this.currentTracks();
    if (index < 0 || index >= tracks.length) return;
    
    // Se já for a mesma música tocando, não reinicia
    if (this.currentTrackIndex() === index && this.audio.src && this.audio.src !== '') {
      return;
    }
    
    this.currentTrackIndex.set(index);
    this.loadTrack(index);
    this.play();
  }

  getAudioElement(): HTMLAudioElement {
    return this.audio;
  }

  activateEqualizer() {
    // Se já estiver ativo e inicializado, apenas resume o contexto
    if (this.isEqualizerActive && this.equalizer.isInitialized()) {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      return;
    }
    
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      this.equalizer.activateWithAudio(this.audio, this.audioContext);
      this.isEqualizerActive = true;
    } catch (e) {
      console.error('Equalizer activation failed:', e);
    }
  }

  deactivateEqualizer() {
    this.equalizer.turnOff();
    this.isEqualizerActive = false;
  }
}