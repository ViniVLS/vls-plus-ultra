import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService } from './database.service';

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

  constructor(private router: Router, private db: DatabaseService) {
    this.checkSession();
  }

  private async checkSession() {
    const savedUser = await this.db.get('settings', 'current_session');
    if (savedUser) {
      this.currentUser.set(savedUser.data);
    }
  }

  async register(email: string, password: string, username: string) {
    const newUser: User = {
      id: Math.random().toString(36).substring(2),
      email: email,
      username: username
    };

    const users = await this.db.get('settings', 'all_users') || { key: 'all_users', data: [] };
    
    if (users.data.find((u: any) => u.email === email)) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    users.data.push({ ...newUser, password });
    await this.db.set('settings', users);

    await this.saveSession(newUser);
    return newUser;
  }

  async login(email: string, password: string) {
    const users = await this.db.get('settings', 'all_users') || { key: 'all_users', data: [] };
    const foundUser = users.data.find((u: any) => u.email === email && u.password === password);

    if (!foundUser) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const { password: _, ...userWithoutPassword } = foundUser;
    await this.saveSession(userWithoutPassword);
    return userWithoutPassword;
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
    
    const users = await this.db.get('settings', 'all_users') || { key: 'all_users', data: [] };
    const index = users.data.findIndex((u: any) => u.email === current.email);
    
    if (index !== -1) {
      users.data[index] = { ...users.data[index], ...profileData };
      await this.db.set('settings', users);
    }

    await this.saveSession(updatedUser);
    return updatedUser;
  }

  async logout() {
    await this.db.delete('settings', 'current_session');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
    window.dispatchEvent(new CustomEvent('vls-logout'));
  }
}
