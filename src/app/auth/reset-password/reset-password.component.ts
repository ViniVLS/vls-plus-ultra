import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card glass">
        <div class="brand">
          <div class="logo-box">V+</div>
          <h1>NOVA SENHA</h1>
          <p class="subtitle">REDEFINIR ACESSO AO PLAYER</p>
        </div>

        <form (submit)="onResetPassword(); $event.preventDefault()">
          <div class="form-group">
            <label>Nova Senha</label>
            <div class="input-wrapper">
              <span class="icon">🔒</span>
              <input [type]="showPassword ? 'text' : 'password'" 
                     name="password" 
                     [(ngModel)]="password" 
                     placeholder="••••••••" 
                     required>
              <button type="button" class="btn-toggle-pass" (click)="showPassword = !showPassword">
                <span *ngIf="!showPassword">👁️</span>
                <span *ngIf="showPassword">🙈</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Confirmar Nova Senha</label>
            <div class="input-wrapper">
              <span class="icon">🔒</span>
              <input [type]="showConfirmPassword ? 'text' : 'password'" 
                     name="confirmPassword" 
                     [(ngModel)]="confirmPassword" 
                     placeholder="••••••••" 
                     required>
              <button type="button" class="btn-toggle-pass" (click)="showConfirmPassword = !showConfirmPassword">
                <span *ngIf="!showConfirmPassword">👁️</span>
                <span *ngIf="showConfirmPassword">🙈</span>
              </button>
            </div>
          </div>

          <div class="error-msg" *ngIf="error">{{ error }}</div>

          <button type="submit" class="btn-primary" [disabled]="loading">
            {{ loading ? 'GRAVANDO...' : 'ATUALIZAR SENHA' }}
          </button>
        </form>

        <div class="footer-links">
          <p><a routerLink="/login">Voltar ao Login</a></p>
        </div>
      </div>

      <div class="bg-blobs">
        <div class="blob red"></div>
        <div class="blob purple"></div>
      </div>
    </div>
  `,
  styles: [`
    @import '../login/login.component.scss';
    
    .auth-card {
      max-width: 450px;
      animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class ResetPasswordComponent {
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  error = '';
  loading = false;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private router: Router
  ) {}

  async onResetPassword() {
    if (this.password !== this.confirmPassword) {
      this.error = 'As senhas não coincidem.';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'A senha deve ter pelo menos 6 caracteres.';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const { error } = await this.supabase.client.auth.updateUser({
        password: this.password
      });

      if (error) throw error;

      this.toast.success('Senha atualizada com sucesso! Faça login agora.');
      this.router.navigate(['/login']);
    } catch (err: any) {
      this.error = err.message || 'Erro ao atualizar senha.';
      this.toast.error('Erro na redefinição.');
    } finally {
      this.loading = false;
    }
  }
}
