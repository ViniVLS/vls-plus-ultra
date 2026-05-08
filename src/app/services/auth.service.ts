import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService } from './database.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

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
  private supabase: SupabaseClient;
  private currentUser = signal<User | null>(null);
  
  public user = computed(() => this.currentUser());
  public isAuthenticated = computed(() => !!this.currentUser());

  constructor(private router: Router, private db: DatabaseService) {
    this.supabase = createClient(environment.supabase.url, environment.supabase.key);
    this.checkSession();
  }

  private async checkSession() {
    // 1. Tentar carregar sessão do Supabase (Cloud)
    const { data: { session } } = await this.supabase.auth.getSession();
    
    if (session?.user) {
      // Carregar perfil estendido da tabela 'profiles'
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      const user: User = {
        id: session.user.id,
        email: session.user.email!,
        username: profile?.username || 'Usuário',
        fullName: profile?.full_name,
        cpf: profile?.cpf,
        phone: profile?.phone,
        address: profile?.address
      };
      
      this.currentUser.set(user);
      await this.db.set('settings', { key: 'current_session', data: user });
    } else {
      // 2. Fallback para sessão local (Offline/Android)
      const savedUser = await this.db.get('settings', 'current_session');
      if (savedUser) {
        this.currentUser.set(savedUser.data);
      }
    }
  }

  async register(email: string, password: string, username: string) {
    // 1. Registro no Supabase
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

    // 2. Salvar localmente (Android _TEMP)
    await this.saveSession(newUser);
    return newUser;
  }

  async login(email: string, password: string) {
    // 1. Login no Supabase
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Tentativa de login offline se houver erro de rede
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

    // 2. Carregar perfil estendido
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
    
    // 1. Atualizar no Supabase (Nuvem)
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

    // 2. Sempre atualizar localmente (Android _TEMP)
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
