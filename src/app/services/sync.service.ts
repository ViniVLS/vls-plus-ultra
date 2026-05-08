import { Injectable } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private syncSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private supabase: SupabaseService
  ) {
    this.startAutoSync();
  }

  private startAutoSync() {
    // Sincroniza a cada 30 segundos se estiver online
    this.syncSubscription = interval(30000).subscribe(() => {
      this.performSync();
    });
  }

  async performSync() {
    if (!this.authService.isAuthenticated()) return;

    console.log('🔄 Verificando conexão para sincronização...');

    if (navigator.onLine) {
      console.log('🌐 Conectado! Iniciando sincronia com Supabase...');
      try {
        await this.supabase.syncWithCloud();
        console.log('✅ Sincronização concluída.');
      } catch (err) {
        console.error('❌ Falha na sincronia automática:', err);
      }
    } else {
      console.log('📡 Offline. Aguardando conexão para sincronizar.');
    }
  }

  stopSync() {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
  }
}
