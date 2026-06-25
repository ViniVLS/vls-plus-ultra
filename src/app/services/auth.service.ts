import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService } from './database.service';
import { SupabaseService } from './supabase.service';

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  fullName?: string;
  cpf?: string;
  phone?: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private loadingAvatar = signal<boolean>(false);
  
  public user = computed(() => this.currentUser());
  public isAuthenticated = computed(() => !!this.currentUser());
  public isLoadingAvatar = computed(() => this.loadingAvatar());

  private initPromise: Promise<void>;

  constructor(
    private router: Router, 
    private db: DatabaseService,
    private supabaseService: SupabaseService
  ) {
    this.initAuthListener();
    this.initPromise = this.checkSession();
  }

  public async isReady(): Promise<boolean> {
    await this.initPromise;
    return this.isAuthenticated();
  }

  private get supabase() {
    return this.supabaseService.client;
  }

  private initAuthListener() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // Não usar await aqui para não travar o evento
          this.syncProfile(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        this.currentUser.set(null);
        this.db.delete('settings', 'current_session');
      }
    });
  }

  private async syncProfile(supabaseUser: any) {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (profile) {
        const user: User = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          username: profile.username || 'Usuário',
          fullName: profile.full_name,
          cpf: profile.cpf,
          phone: profile.phone,
          address: profile.address,
          avatarUrl: profile.avatar_url
        };
        
        this.currentUser.set(user);
        await this.db.set('settings', { key: 'current_session', data: user });

        // Restaurar Equalizador do Perfil (se existir)
        if (profile.equalizer_settings) {
          await this.db.set('settings', { key: 'equalizer_state', data: profile.equalizer_settings });
          console.log('🎧 Equalizador restaurado da nuvem.');
        }
      }
    } catch (e) {
      // Falha silenciosa: mantém os dados que já temos no sinal (offline)
      console.log('Não foi possível sincronizar perfil com a nuvem (Offline).');
    }
  }

  private async checkSession() {
    // Carregamento Local Imediato (Offline-First)
    const savedUser = await this.db.get('settings', 'current_session');
    if (savedUser) {
      this.currentUser.set(savedUser.data);
    }

    // Validação em segundo plano (Cloud) - Não usar await para não bloquear a inicialização!
    this.validateSessionCloud();
  }

  private async validateSessionCloud() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session?.user) {
        await this.syncProfile(session.user);
      }
    } catch (e) {
      console.log('Ambiente Offline/Rede instável: Mantendo sessão local.');
    }
  }

  async register(email: string, password: string, username: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });

    if (error) throw error;
    if (!data.user) throw new Error('Falha no cadastro');

    const newUser: User = {
      id: data.user.id,
      email: email,
      username: username
    };

    await this.saveSession(newUser);
    return newUser;
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (error.message.includes('Fetch') || error.message.includes('Network')) {
        const users = await this.db.get('settings', 'all_users') || { key: 'all_users', data: [] };
        const foundUser = users.data.find((u: any) => u.email === email && u.password === password);
        if (foundUser) {
          const { password: _, ...userWithoutPassword } = foundUser;
          await this.saveSession(userWithoutPassword);
          return userWithoutPassword;
        }
      }
      throw error;
    }

    // Criar objeto de usuário básico imediatamente para não travar a UI
    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      username: 'Carregando...'
    };

    // Salva sessão básica e navega logo
    await this.saveSession(user);

    // Busca o perfil completo em "background"
    this.syncProfile(data.user).then(() => {
      console.log('Perfil sincronizado em background.');
    });

    return user;
  }

  private async saveSession(user: User) {
    await this.db.set('settings', { key: 'current_session', data: user });
    this.currentUser.set(user);
    this.router.navigate(['/home']);
  }

  async uploadAvatar(file: File): Promise<string> {
    const current = this.currentUser();
    if (!current) throw new Error('Usuário não autenticado');

    this.loadingAvatar.set(true);
    
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${current.id}/avatar.${ext}`;
      const fileBuffer = await this.fileToArrayBuffer(file);

      const { data, error } = await this.supabase.storage
        .from('avatars')
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;
      
      await this.updateProfile({ avatarUrl });
      
      return avatarUrl;
    } finally {
      this.loadingAvatar.set(false);
    }
  }

  private fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async updateProfile(profileData: Partial<User>) {
    const current = this.currentUser();
    if (!current) throw new Error('Usuário não autenticado');

    const updatedUser = { ...current, ...profileData };
    
    // Atualiza local imediatamente (UX)
    await this.saveSession(updatedUser);

    try {
      const { error } = await this.supabase
        .from('profiles')
        .upsert({
          id: current.id,
          full_name: profileData.fullName,
          cpf: profileData.cpf,
          phone: profileData.phone,
          address: profileData.address,
          avatar_url: profileData.avatarUrl,
          updated_at: new Date()
        });

      if (error) {
        console.error('Erro de permissão no Supabase (Verifique as políticas RLS):', error);
        // Não jogamos erro para o usuário pois o local já salvou (Offline-First)
      } else {
        console.log('✅ Perfil sincronizado com sucesso.');
      }
    } catch (e) {
      console.error('Falha na rede durante sincronia de perfil:', e);
    }

    return updatedUser;
  }

  async logout() {
    await this.supabase.auth.signOut();
    await this.db.delete('settings', 'current_session');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
    window.dispatchEvent(new CustomEvent('vls-logout'));
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    });
    if (error) throw error;
    return true;
  }
}
