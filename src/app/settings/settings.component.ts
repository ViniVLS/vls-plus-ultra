import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  email = '';
  password = '';
  isLogin = true;
  loading = false;
  message = '';

  // Campos de Perfil
  fullName = '';
  cpf = '';
  phone = '';
  
  address = {
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  };

  playlists: any[] = [];
  favorites: any[] = [];

  constructor(public authService: AuthService) {}

  get user() {
    return this.authService.user();
  }

  async ngOnInit() {
    const u = this.user;
    if (u) {
      this.loadUserData();
      this.fillForm();
    }
  }

  fillForm() {
    const u = this.user;
    if (u) {
      this.fullName = u.fullName || '';
      this.cpf = u.cpf || '';
      this.phone = u.phone || '';
      if (u.address) {
        this.address = { ...u.address, complement: u.address.complement || '' };
      }
    }
  }

  async loadUserData() {
    this.playlists = JSON.parse(localStorage.getItem('vls_playlists') || '[]');
    this.favorites = JSON.parse(localStorage.getItem('vls_favorites') || '[]');
  }

  async handleAuth() {
    this.loading = true;
    this.message = '';
    try {
      if (this.isLogin) {
        await this.authService.login(this.email, this.password);
      } else {
        await this.authService.register(this.email, this.password, 'Usuário VLS');
      }
      this.loadUserData();
      this.fillForm();
    } catch (e: any) {
      this.message = e.message;
    } finally {
      this.loading = false;
    }
  }

  async searchCep() {
    const cep = this.address.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    this.loading = true;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        this.address.street = data.logradouro;
        this.address.neighborhood = data.bairro;
        this.address.city = data.localidade;
        this.address.state = data.uf;
      } else {
        this.message = 'CEP não encontrado.';
      }
    } catch (e) {
      this.message = 'Erro ao buscar CEP.';
    } finally {
      this.loading = false;
    }
  }

  async saveProfile() {
    this.loading = true;
    this.message = '';
    try {
      await this.authService.updateProfile({
        fullName: this.fullName,
        cpf: this.cpf,
        phone: this.phone,
        address: this.address
      });
      this.message = 'Perfil atualizado com sucesso!';
    } catch (e: any) {
      this.message = e.message;
    } finally {
      this.loading = false;
    }
  }

  logout() {
    this.authService.logout();
    this.playlists = [];
    this.favorites = [];
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.message = '';
  }
}
