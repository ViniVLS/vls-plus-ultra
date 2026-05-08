import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
  rememberMe = true;
  error = '';
  loading = false;

  constructor(private authService: AuthService) {
    this.checkRememberedEmail();
  }

  async checkRememberedEmail() {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'remembered_email' });
    if (value) {
      this.email = value;
      this.rememberMe = true;
    }
  }

  async onLogin() {
    if (!this.email || !this.password) {
      this.error = 'Por favor, preencha todos os campos.';
      return;
    }

    this.loading = true;
    this.error = '';

    const { Preferences } = await import('@capacitor/preferences');
    if (this.rememberMe) {
      await Preferences.set({ key: 'remembered_email', value: this.email });
    } else {
      await Preferences.remove({ key: 'remembered_email' });
    }

    try {
      await this.authService.login(this.email, this.password);
    } catch (err: any) {
      this.error = err.message || 'Erro ao realizar login.';
    } finally {
      this.loading = false;
    }
  }
}
