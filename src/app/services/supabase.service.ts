import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { DatabaseService } from './database.service';
import { Preferences } from '@capacitor/preferences';

// Custom Storage para evitar NavigatorLock e garantir persistência no Android
const capacitorStorage = {
  getItem: async (key: string) => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  },
};

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public client: SupabaseClient;
  private isOnline = signal<boolean>(navigator.onLine);

  constructor(private db: DatabaseService) {
    this.client = createClient(
      environment.supabase.url,
      environment.supabase.key,
      {
        auth: {
          storage: capacitorStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        }
      }
    );
    
    window.addEventListener('online', () => this.handleOnlineStatus(true));
    window.addEventListener('offline', () => this.handleOnlineStatus(false));
  }

  private handleOnlineStatus(status: boolean) {
    this.isOnline.set(status);
    if (status) {
      this.syncWithCloud();
    }
  }

  async syncWithCloud() {
    const { data: { session } } = await this.client.auth.getSession();
    if (!session?.user || !this.isOnline()) return;

    const userId = session.user.id;
    console.log('📡 Sincronizando dados para o usuário:', userId);

    try {
      // 1. Sincronizar Playlists (Upsert genérico)
      const localPlaylists = await this.db.getAll('playlists');
      for (const pl of localPlaylists) {
        const { error } = await this.client.from('playlists').upsert({
          user_id: userId,
          name: pl.nome || pl.name,
          tracks: pl.musicas || pl.tracks
        });
        
        if (error) console.warn('Aviso de sincronia (Playlist):', error.message);
      }

      // 2. Sincronizar Favoritos (Apenas se a tabela existir)
      const localFavs = await this.db.get('settings', 'favorites');
      if (localFavs?.data && Array.isArray(localFavs.data)) {
        const favsToSync = localFavs.data.map((f: any) => ({
          user_id: userId,
          track_name: f.name,
          track_metadata: f
        }));
        
        const { error: favError } = await this.client.from('favorites').upsert(favsToSync);
        if (favError) console.warn('Aviso de sincronia (Favoritos):', favError.message);
      }

      console.log('✅ Tentativa de sincronia finalizada.');
    } catch (e) {
      console.error('❌ Erro inesperado na sincronia:', e);
    }
  }

  // Métodos de dados unificados
  async savePlaylist(name: string, tracks: any[]) {
    const playlist = { nome: name, musicas: tracks, id_local: Date.now() };
    await this.db.set('playlists', playlist);
    
    const { data: { session } } = await this.client.auth.getSession();
    if (session?.user) {
      await this.client.from('playlists').upsert({
        user_id: session.user.id,
        name: name,
        tracks: tracks
      });
    }
    return playlist;
  }

  async getPlaylists() {
    const local = await this.db.getAll('playlists');
    const { data: { session } } = await this.client.auth.getSession();
    
    if (this.isOnline() && session?.user) {
      const { data } = await this.client.from('playlists')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (data && data.length > 0) return data;
    }
    return local;
  }

  async saveFavorites(favorites: any[]) {
    await this.db.set('settings', { key: 'favorites', data: favorites, updatedAt: Date.now() });
    const { data: { session } } = await this.client.auth.getSession();
    if (session?.user) {
      // Sincronia em lote via upsert
      const favsToSync = favorites.map(f => ({
        user_id: session.user.id,
        track_name: f.name,
        track_metadata: f
      }));
      await this.client.from('favorites').upsert(favsToSync);
    }
  }

  async excluirPlaylist(playlist: any) {
    const { data: { session } } = await this.client.auth.getSession();
    if (session?.user) {
      await this.client.from('playlists')
        .delete()
        .eq('user_id', session.user.id)
        .eq('name', playlist.nome || playlist.name);
    }
    // Remove do banco local também
    await this.db.delete('playlists', playlist.id_local);
  }

  async getFavorites() {
    const local = await this.db.get('settings', 'favorites');
    const { data: { session } } = await this.client.auth.getSession();
    
    if (this.isOnline() && session?.user) {
      const { data } = await this.client.from('favorites')
        .select('track_metadata')
        .eq('user_id', session.user.id);
      
      if (data) return data.map(d => d.track_metadata);
    }
    return local ? local.data : [];
  }

  async saveLibrary(files: any[]) {
    await this.db.set('settings', { key: 'last_library', data: files, updatedAt: Date.now() });
  }

  async getLibrary() {
    const lib = await this.db.get('settings', 'last_library');
    return lib ? lib.data : [];
  }

  async updateVideoProgress(userId: string, videoId: string, progress: number) {
    const key = `progress_${userId}_${videoId}`;
    await this.db.set('settings', { 
      key, 
      data: { progress, updatedAt: Date.now() } 
    });
  }

  async getVideoProgress(userId: string, videoId: string) {
    const data = await this.db.get('settings', `progress_${userId}_${videoId}`);
    return data ? data.data : null;
  }

  getCurrentUser() {
    return null;
  }
}