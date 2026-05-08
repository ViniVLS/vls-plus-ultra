import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DialogService } from '../../services/dialog.service';
import { ToastService } from '../../services/toast.service';
import { VERSION_DISPLAY } from '../../version';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  version = VERSION_DISPLAY;
  email = '';
  password = '';
  showPassword = false;
  rememberMe = true;
  error = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private dialog: DialogService,
    private toast: ToastService
  ) {
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

  async onForgotPassword() {
    const email = await this.dialog.prompt(
      'Recuperar Senha',
      'Digite seu e-mail cadastrado para receber o link de recuperação:',
      this.email
    );

    if (email) {
      this.loading = true;
      try {
        await this.authService.resetPassword(email);
        this.toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      } catch (err: any) {
        this.toast.error('Erro ao enviar e-mail: ' + (err.message || 'Tente novamente.'));
      } finally {
        this.loading = false;
      }
    }
  }
}
