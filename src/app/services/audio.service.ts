import { Injectable, signal, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { EqualizerService } from '../equalizer/equalizer.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audio: HTMLAudioElement = new Audio();
  public audioContext: AudioContext | null = null;
  public isEqualizerActive: boolean = false;
  
  currentTracks = signal<any[]>([]); 
  currentTrackIndex = signal<number>(0);
  currentTrackArt = signal<string | null>(null);
  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  
  constructor(
    private supabase: SupabaseService,
    private authService: AuthService,
    private equalizer: EqualizerService
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

    this.audio.onplay = () => this.isPlaying.set(true);
    this.audio.onpause = () => this.isPlaying.set(false);

    // Efeito para parar a música se o usuário sair
    effect(() => {
      const user = this.authService.user();
      if (!user) {
        this.stop();
      }
    }, { allowSignalWrites: true });
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
      const results = await Promise.all(batch.map(async (file) => ({
        file: file,
        name: file.name,
        size: file.size,
        duration: await this.getDuration(file)
      })));
      tracksWithMetadata.push(...results);
    }
    
    this.currentTracks.set(tracksWithMetadata);
    this.selectTrack(index);
  }

  private getDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      audio.src = url;
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      // Timeout de segurança para não travar
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(0);
      }, 5000);
    });
  }

  private loadTrack(index: number) {
    const tracks = this.currentTracks();
    const trackObj = tracks[index];
    
    if (trackObj && trackObj.file) {
      // Limpeza segura de URLs antigas
      if (this.audio.src && this.audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audio.src);
      }
      
      this.audio.src = URL.createObjectURL(trackObj.file);
      this.audio.load();
      this.extractMetadata(trackObj.file);
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
        },
        onError: (error: any) => {
          console.warn('Metadata extraction error:', error);
        }
      });
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