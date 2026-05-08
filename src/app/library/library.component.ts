import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AudioService } from '../services/audio.service';
import { SupabaseService } from '../services/supabase.service';

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

  constructor(
    public audioService: AudioService,
    private supabase: SupabaseService
  ) {}

  async ngOnInit() {
    await this.loadPlaylists();
    this.loadFavorites();
  }

  async loadPlaylists() {
    try {
      this.playlistsSalvas = await this.supabase.getPlaylists();
    } catch (e) {
      console.warn('Error loading playlists', e);
    }
  }

  loadFavorites() {
    const saved = localStorage.getItem('favorites');
    if (saved) {
      this.favorites = JSON.parse(saved);
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
    }
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files.length > 0) {
      const audioFiles = Array.from(files).filter(file => {
        const name = file.name.toLowerCase();
        return file.type.startsWith('audio/') ||
               ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].some(ext => name.endsWith(ext));
      });

      if (audioFiles.length > 0) {
        const existingFiles = this.audioService.currentTracks().map(t => t.file);
        this.audioService.setTracks([...existingFiles, ...audioFiles], this.audioService.currentTrackIndex());
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

  saveAsPlaylist() {
    const tracks = this.audioService.currentTracks();
    if (tracks.length === 0) return;
    const name = prompt('Nome da Playlist:', 'Minha Playlist');
    if (name) {
      const newPlaylist = {
        nome: name,
        musicas: tracks.map(t => t.name),
        date: new Date().toISOString()
      };
      this.playlistsSalvas.push(newPlaylist);
      localStorage.setItem('playlists', JSON.stringify(this.playlistsSalvas));
      alert('Playlist salva com sucesso!');
    }
  }

  async loadPlaylist(playlist: any) {
    const tracks = this.audioService.currentTracks();
    const trackNames = playlist.musicas || [];

    const loadedTracks = tracks.filter(t => trackNames.includes(t.name));
    if (loadedTracks.length > 0) {
      this.audioService.setTracks(loadedTracks, 0);
      this.audioService.play();
      alert(`Playlist "${playlist.nome}" carregada!`);
    }
  }

  excluirPlaylist(index: number) {
    if (confirm('Deseja excluir esta playlist?')) {
      this.playlistsSalvas.splice(index, 1);
      localStorage.setItem('playlists', JSON.stringify(this.playlistsSalvas));
    }
  }

  isFavorite(track: any): boolean {
    return this.favorites.some(f => f.name === track.name);
  }

  toggleFavorite(track: any) {
    const index = this.favorites.findIndex(f => f.name === track.name);
    if (index > -1) {
      this.favorites.splice(index, 1);
    } else {
      this.favorites.push({ name: track.name, size: track.size });
    }
    localStorage.setItem('favorites', JSON.stringify(this.favorites));
  }
}