import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public client: SupabaseClient;
  private currentUser = signal<any>(null);
  private isOnline = signal<boolean>(navigator.onLine);

  constructor(private db: DatabaseService) {
    this.client = createClient(
      environment.supabase.url,
      environment.supabase.key
    );
    window.addEventListener('online', () => this.handleOnlineStatus(true));
    window.addEventListener('offline', () => this.handleOnlineStatus(false));
  }

  // A inicialização agora é gerenciada pelo AuthService

  private handleOnlineStatus(status: boolean) {
    this.isOnline.set(status);
    if (status) {
      this.syncWithCloud();
    }
  }

  private async syncWithCloud() {
    const user = this.currentUser();
    if (!user || !this.isOnline()) return;

    console.log('📡 Conexão restaurada! Iniciando sincronia de dados...');

    try {
      // 1. Sincronizar Playlists
      const localPlaylists = await this.db.getAll('playlists');
      for (const pl of localPlaylists) {
        await this.client.from('playlists').upsert({
          user_id: user.id,
          name: pl.nome || pl.name,
          tracks: pl.musicas || pl.tracks
        });
      }

      // 2. Sincronizar Favoritos
      const localFavs = await this.db.get('settings', 'favorites');
      if (localFavs?.data && Array.isArray(localFavs.data)) {
        for (const fav of localFavs.data) {
          await this.client.from('favorites').upsert({
            user_id: user.id,
            track_name: fav.name,
            track_metadata: fav
          });
        }
      }

      console.log('✅ Sincronia concluída com sucesso!');
    } catch (e) {
      console.error('❌ Falha na sincronia automática:', e);
    }
  }

  async signUp(email: string, pass: string) {
    if (this.isOnline()) {
      const { data, error } = await this.client.auth.signUp({ email, password: pass });
      if (data.user) {
        await this.db.set('settings', { key: 'current_user', data: data.user });
        this.currentUser.set(data.user);
      }
      return { data, error };
    }
    const mockUser = { email, id: 'local_' + Date.now() };
    await this.db.set('settings', { key: 'current_user', data: mockUser });
    this.currentUser.set(mockUser);
    return { data: { user: mockUser }, error: null };
  }

  async signIn(email: string, pass: string) {
    if (this.isOnline()) {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password: pass });
      if (data.user) {
        await this.db.set('settings', { key: 'current_user', data: data.user });
        this.currentUser.set(data.user);
      }
      return { data, error };
    }
    const localUser = await this.db.get('settings', 'current_user');
    if (localUser && localUser.data.email === email) {
      this.currentUser.set(localUser.data);
      return { data: { user: localUser.data }, error: null };
    }
    return { data: null, error: { message: 'Usuário não encontrado offline' } };
  }

  async signOut() {
    await this.db.delete('settings', 'current_user');
    this.currentUser.set(null);
    if (this.isOnline()) {
      await this.client.auth.signOut();
    }
  }

  getCurrentUser() {
    return this.currentUser();
  }

  async getUser() {
    return this.currentUser();
  }

  async getFavorites() {
    const favs = await this.db.get('settings', 'favorites');
    return favs ? favs.data : [];
  }

  async saveFavorites(favorites: any[]) {
    await this.db.set('settings', { key: 'favorites', data: favorites, updatedAt: Date.now() });
  }

  // --- Persistência de Estado de Áudio ---
  async savePlaybackState(trackIndex: number, currentTime: number) {
    await this.db.set('settings', { 
      key: 'playback_state', 
      data: { trackIndex, currentTime, updatedAt: Date.now() } 
    });
  }

  async getPlaybackState() {
    const state = await this.db.get('settings', 'playback_state');
    return state ? state.data : null;
  }

  // --- Persistência da Biblioteca (Arquivos/Pastas) ---
  async saveLibrary(files: any[]) {
    await this.db.set('settings', { key: 'last_library', data: files, updatedAt: Date.now() });
  }

  async getLibrary() {
    const lib = await this.db.get('settings', 'last_library');
    return lib ? lib.data : [];
  }

  // --- Playlists (Local First) ---
  async savePlaylist(name: string, tracks: any[]) {
    const playlist = { nome: name, musicas: tracks, id_local: Date.now() };
    await this.db.set('playlists', playlist);
    
    if (this.isOnline() && this.currentUser() && !this.currentUser().id.startsWith('local_')) {
      await this.client.from('playlists').upsert({
        user_id: this.currentUser().id,
        name: name,
        tracks: tracks
      });
    }
    return playlist;
  }

  async getPlaylists() {
    const local = await this.db.getAll('playlists');
    if (this.isOnline() && this.currentUser() && !this.currentUser().id.startsWith('local_')) {
      const { data } = await this.client.from('playlists').select('*').eq('user_id', this.currentUser().id);
      return data || local;
    }
    return local;
  }

  // --- Sincronização de Progresso ---
  async updateVideoProgress(userId: string, videoId: string, progress: number) {
    await this.db.set('settings', { 
      key: `progress_${userId}_${videoId}`, 
      data: { progress, updatedAt: Date.now() } 
    });
  }

  async getVideoProgress(userId: string, videoId: string) {
    const data = await this.db.get('settings', `progress_${userId}_${videoId}`);
    return data ? data.data : null;
  }
}