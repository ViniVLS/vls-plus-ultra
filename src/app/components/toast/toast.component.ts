import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toastService.toasts()" 
           class="toast glassmorphism" 
           [ngClass]="toast.type"
           (click)="toastService.remove(toast.id)">
        <div class="icon">
          <span *ngIf="toast.type === 'success'">✅</span>
          <span *ngIf="toast.type === 'error'">❌</span>
          <span *ngIf="toast.type === 'info'">ℹ️</span>
          <span *ngIf="toast.type === 'warning'">⚠️</span>
        </div>
        <div class="message">{{ toast.message }}</div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 90%;
      max-width: 400px;
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      padding: 12px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: white;
      font-size: 0.9rem;
      font-weight: 500;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease-out forwards;
      cursor: pointer;
      border-left: 4px solid transparent;
    }

    @keyframes slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .glassmorphism {
      background: rgba(20, 20, 20, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .success { border-left-color: #00ff88; box-shadow: 0 0 15px rgba(0, 255, 136, 0.15); }
    .error { border-left-color: #ff4444; box-shadow: 0 0 15px rgba(255, 68, 68, 0.15); }
    .info { border-left-color: #00d4ff; box-shadow: 0 0 15px rgba(0, 212, 255, 0.15); }

    .message {
      flex: 1;
      line-height: 1.4;
    }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
