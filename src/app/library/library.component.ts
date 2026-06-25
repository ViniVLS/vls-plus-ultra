import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AudioService } from '../services/audio.service';
import { SupabaseService } from '../services/supabase.service';
import { ToastService } from '../services/toast.service';
import { DialogService } from '../services/dialog.service';
import { VlsFilesystemService } from '../services/filesystem.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('folderInput') folderInput!: ElementRef;

  playlistsSalvas: any[] = [];
  favorites: any[] = [];
  loading = false;

  constructor(
    public audioService: AudioService,
    private supabase: SupabaseService,
    private toast: ToastService,
    private dialog: DialogService,
    private fs: VlsFilesystemService
  ) {}

  async ngOnInit() {
    this.loading = true;
    await Promise.all([
      this.loadPlaylists(),
      this.loadFavorites(),
      this.loadLastLibrary()
    ]);
    this.loading = false;
  }

  async loadPlaylists() {
    try {
      this.playlistsSalvas = await this.supabase.getPlaylists();
    } catch (e) {
      console.warn('Erro ao carregar playlists', e);
    }
  }

  async loadFavorites() {
    try {
      this.favorites = await this.supabase.getFavorites();
    } catch (e) {
      console.warn('Erro ao carregar favoritos', e);
    }
  }

  async loadLastLibrary() {
    try {
      const lib = await this.supabase.getLibrary();
      if (lib && lib.length > 0 && this.audioService.currentTracks().length === 0) {
        this.audioService.setTracks(lib, 0);
      }
    } catch (e) {
      console.warn('Erro ao carregar biblioteca anterior', e);
    }
  }

  triggerFolderPicker() {
    this.folderInput.nativeElement.click();
  }

  async processAudioFiles(audioFiles: File[]): Promise<any[]> {
    const isNative = Capacitor.isNativePlatform();
    const processed = [];
    
    if (isNative) {
      this.loading = true;
      this.toast.info(`Importando ${audioFiles.length} músicas para o app...`);
      
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        try {
          const nativeUrl = await this.fs.saveNativeAudio(file.name, file);
          processed.push({
            name: file.name,
            size: file.size,
            nativeUrl: nativeUrl
          });
        } catch (err) {
          console.warn(`Erro ao copiar arquivo ${file.name}:`, err);
          processed.push({
            name: file.name,
            size: file.size
          });
        }
      }
      this.loading = false;
    } else {
      processed.push(...audioFiles);
    }
    
    return processed;
  }

  async onFolderSelected(event: any) {
    const files: FileList = event.target.files;
    if (files.length > 0) {
      const audioFiles = Array.from(files).filter(file => {
        const name = file.name.toLowerCase();
        return file.type.startsWith('audio/') ||
               ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].some(ext => name.endsWith(ext));
      });

      const processedTracks = await this.processAudioFiles(audioFiles);
      await this.audioService.setTracks(processedTracks, 0);
      await this.supabase.saveLibrary(this.audioService.currentTracks());
      
      this.audioService.play();
      this.toast.success('Pasta carregada com sucesso!');
    }
  }

  async onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (files.length > 0) {
      const audioFiles = Array.from(files).filter(file => {
        const name = file.name.toLowerCase();
        return file.type.startsWith('audio/') ||
               ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].some(ext => name.endsWith(ext));
      });

      if (audioFiles.length > 0) {
        const processedTracks = await this.processAudioFiles(audioFiles);
        const current = this.audioService.currentTracks();
        await this.audioService.setTracks([...current, ...processedTracks], this.audioService.currentTrackIndex());
        await this.supabase.saveLibrary(this.audioService.currentTracks());
        
        this.toast.info(`${audioFiles.length} arquivos adicionados.`);
      }
    }
  }

  selectMusica(index: number) {
    this.audioService.selectTrack(index);
  }

  formatTime(seconds: number): string {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async saveAsPlaylist() {
    const tracks = this.audioService.currentTracks();
    if (tracks.length === 0) return;
    
    const name = await this.dialog.prompt('Nova Playlist', 'Como deseja chamar esta playlist?', 'Minha Playlist');
    if (name) {
      this.loading = true;
      try {
        const trackData = tracks.map(t => ({ 
          name: t.name, 
          size: t.size,
          duration: t.duration,
          nativeUrl: t.nativeUrl || undefined
        }));
        await this.supabase.savePlaylist(name, trackData);
        await this.loadPlaylists();
        this.toast.success('Playlist salva e sincronizada!');
      } catch (e) {
        this.toast.error('Erro ao salvar playlist.');
      } finally {
        this.loading = false;
      }
    }
  }

  async loadPlaylist(playlist: any) {
    const playlistTracks = playlist.musicas || playlist.tracks || [];
    
    if (playlistTracks.length > 0) {
      const tracksToLoad = playlistTracks.map((t: any) => ({
        name: t.name || t,
        size: t.size || 0,
        duration: t.duration || 0,
        nativeUrl: t.nativeUrl || undefined
      }));
      
      await this.audioService.setTracks(tracksToLoad, 0);
      this.audioService.play();
      this.toast.info(`Playlist "${playlist.nome || playlist.name}" carregada.`);
    } else {
      this.toast.warning('Esta playlist está vazia.');
    }
  }

  async excluirPlaylist(playlist: any) {
    const confirmed = await this.dialog.confirm(
      'Excluir Playlist', 
      `Deseja realmente excluir a playlist "${playlist.nome || playlist.name}"? Esta ação não pode ser desfeita.`
    );

    if (confirmed) {
      this.loading = true;
      try {
        await this.supabase.excluirPlaylist(playlist);
        await this.loadPlaylists();
        this.toast.success('Playlist removida.');
      } catch (e) {
        this.toast.error('Erro ao excluir playlist.');
      } finally {
        this.loading = false;
      }
    }
  }

  isFavorite(track: any): boolean {
    return this.favorites.some(f => f.name === track.name);
  }

  async toggleFavorite(track: any) {
    const index = this.favorites.findIndex(f => f.name === track.name);
    if (index > -1) {
      this.favorites.splice(index, 1);
      this.toast.info('Removido dos favoritos.');
    } else {
      this.favorites.push({ 
        name: track.name, 
        size: track.size,
        duration: track.duration,
        nativeUrl: track.nativeUrl || undefined
      });
      this.toast.success('Adicionado aos favoritos!');
    }
    await this.supabase.saveFavorites(this.favorites);
  }
}