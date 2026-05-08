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
  
  public user = computed(() => this.currentUser());
  public isAuthenticated = computed(() => !!this.currentUser());

  constructor(
    private router: Router, 
    private db: DatabaseService,
    private supabaseService: SupabaseService
  ) {
    this.initAuthListener();
    this.checkSession();
  }

  private get supabase() {
    return this.supabaseService.client;
  }

  private initAuthListener() {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          await this.syncProfile(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        this.currentUser.set(null);
        await this.db.delete('settings', 'current_session');
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
          address: profile.address
        };
        
        this.currentUser.set(user);
        await this.db.set('settings', { key: 'current_session', data: user });
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

    // Validação em segundo plano (Cloud)
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session?.user) {
        await this.syncProfile(session.user);
      }
    } catch (e) {
      console.log('Ambiente Offline: Mantendo sessão local.');
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
      if (error.message.includes('Fetch')) {
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

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      username: profile?.username || 'Usuário',
      fullName: profile?.full_name,
      cpf: profile?.cpf,
      phone: profile?.phone,
      address: profile?.address
    };

    await this.saveSession(user);
    return user;
  }

  private async saveSession(user: User) {
    await this.db.set('settings', { key: 'current_session', data: user });
    this.currentUser.set(user);
    this.router.navigate(['/home']);
  }

  async updateProfile(profileData: Partial<User>) {
    const current = this.currentUser();
    if (!current) throw new Error('Usuário não autenticado');

    const updatedUser = { ...current, ...profileData };
    
    const { error } = await this.supabase
      .from('profiles')
      .upsert({
        id: current.id,
        full_name: profileData.fullName,
        cpf: profileData.cpf,
        phone: profileData.phone,
        address: profileData.address,
        updated_at: new Date()
      });

    if (error) console.error('Erro ao sincronizar com Supabase', error);

    await this.saveSession(updatedUser);
    return updatedUser;
  }

  async logout() {
    await this.supabase.auth.signOut();
    await this.db.delete('settings', 'current_session');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
    window.dispatchEvent(new CustomEvent('vls-logout'));
  }
}
