import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AudioService } from '../services/audio.service';
import { SupabaseService } from '../services/supabase.service';
import { ToastService } from '../services/toast.service';

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
    private toast: ToastService
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

  async onFolderSelected(event: any) {
    const files: FileList = event.target.files;
    if (files.length > 0) {
      const audioFiles = Array.from(files).filter(file => {
        const name = file.name.toLowerCase();
        return file.type.startsWith('audio/') ||
               ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].some(ext => name.endsWith(ext));
      });

      this.audioService.setTracks(audioFiles, 0);
      await this.supabase.saveLibrary(audioFiles);
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
        const current = this.audioService.currentTracks();
        this.audioService.setTracks([...current, ...audioFiles], this.audioService.currentTrackIndex());
        await this.supabase.saveLibrary([...current, ...audioFiles]);
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
    
    const name = prompt('Nome da Playlist:', 'Minha Playlist');
    if (name) {
      this.loading = true;
      try {
        const trackData = tracks.map(t => ({ name: t.name, size: t.size }));
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
    const allTracks = this.audioService.currentTracks();
    const playlistTrackNames = (playlist.musicas || playlist.tracks || []).map((t: any) => typeof t === 'string' ? t : t.name);

    const loadedTracks = allTracks.filter(t => playlistTrackNames.includes(t.name));
    
    if (loadedTracks.length > 0) {
      this.audioService.setTracks(loadedTracks, 0);
      this.audioService.play();
      this.toast.info(`Playlist "${playlist.nome || playlist.name}" carregada.`);
    } else {
      this.toast.warning('Músicas não encontradas na biblioteca atual.');
    }
  }

  async excluirPlaylist(playlist: any) {
    if (confirm('Deseja excluir esta playlist definitivamente?')) {
      this.loading = true;
      try {
        this.playlistsSalvas = this.playlistsSalvas.filter(p => p !== playlist);
        this.toast.success('Playlist removida.');
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
      this.favorites.push({ name: track.name, size: track.size });
      this.toast.success('Adicionado aos favoritos!');
    }
    await this.supabase.saveFavorites(this.favorites);
  }
}