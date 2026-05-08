import { Injectable } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private syncSubscription: Subscription | null = null;
  private isOnline = false;

  constructor(private authService: AuthService) {
    this.startAutoSync();
  }

  // Inicia o loop de 1 minuto para tentativa de sincronização
  private startAutoSync() {
    // Tenta sincronizar a cada 60 segundos
    this.syncSubscription = interval(60000).subscribe(() => {
      this.performSync();
    });
  }

  async performSync() {
    if (!this.authService.isAuthenticated()) return;

    console.log('🔄 Verificando conexão para sincronização...');

    // Simulação de verificação de conexão com Supabase
    this.isOnline = navigator.onLine;

    if (this.isOnline) {
      console.log('🌐 Conectado! Sincronizando dados locais com a nuvem...');
      
      try {
        // 1. Pega dados da pasta VLSPLUS_TEMP (Simulada no LocalStorage)
        const localData = this.getLocalData();
        
        // 2. Aqui entraria o código do Supabase:
        // await this.supabase.from('playlists').upsert(localData.playlists);
        
        console.log('✅ Sincronização concluída com sucesso.');
      } catch (err) {
        console.error('❌ Erro na sincronização:', err);
      }
    } else {
      console.log('📡 Offline. Mantendo dados apenas no local.');
    }
  }

  private getLocalData() {
    // Simulando a coleta de dados da VLSPLUS_TEMP
    return {
      playlists: JSON.parse(localStorage.getItem('vls_playlists') || '[]'),
      favorites: JSON.parse(localStorage.getItem('vls_favorites') || '[]'),
      settings: JSON.parse(localStorage.getItem('vls_settings') || '{}')
    };
  }

  stopSync() {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
  }
}
