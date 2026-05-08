import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../services/dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-overlay" *ngIf="dialogService.activeDialog()" (click)="onCancel()">
      <div class="dialog-card glassmorphism" (click)="$event.stopPropagation()">
        <h3 class="dialog-title">{{ dialogService.activeDialog()?.title }}</h3>
        <p class="dialog-message">{{ dialogService.activeDialog()?.message }}</p>
        
        <div class="dialog-input-container" *ngIf="dialogService.activeDialog()?.type === 'prompt'">
          <input type="text" 
                 [(ngModel)]="inputValue" 
                 [placeholder]="dialogService.activeDialog()?.placeholder || ''"
                 class="pixel-input"
                 (keyup.enter)="onConfirm()"
                 autofocus>
        </div>

        <div class="dialog-actions">
          <button class="btn-cancel" (click)="onCancel()">
            {{ dialogService.activeDialog()?.cancelText }}
          </button>
          <button class="btn-confirm" (click)="onConfirm()">
            {{ dialogService.activeDialog()?.confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    }

    .dialog-card {
      width: 90%;
      max-width: 400px;
      padding: 24px;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .glassmorphism {
      background: rgba(30, 30, 30, 0.9);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .dialog-title {
      margin: 0 0 12px 0;
      font-size: 1.2rem;
      font-weight: 700;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .dialog-message {
      margin: 0 0 24px 0;
      font-size: 0.95rem;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.5;
    }

    .dialog-input-container {
      margin-bottom: 24px;
    }

    .pixel-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 12px;
      border-radius: 10px;
      color: #fff;
      font-size: 1rem;
      outline: none;
      transition: all 0.2s;
    }

    .pixel-input:focus {
      border-color: #ff2d55;
      background: rgba(0, 0, 0, 0.5);
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    button {
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      text-transform: uppercase;
    }

    .btn-cancel {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.6);
    }

    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .btn-confirm {
      background: #ff2d55;
      color: #fff;
      box-shadow: 0 4px 15px rgba(255, 45, 85, 0.3);
    }

    .btn-confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 45, 85, 0.4);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes zoomIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class DialogComponent {
  inputValue = '';

  constructor(public dialogService: DialogService) {
    // Reset input value when dialog opens
    this.inputValue = '';
  }

  onConfirm() {
    const dialog = this.dialogService.activeDialog();
    if (dialog?.type === 'prompt') {
      this.dialogService.close(this.inputValue);
    } else {
      this.dialogService.close(true);
    }
    this.inputValue = '';
  }

  onCancel() {
    this.dialogService.close(null);
    this.inputValue = '';
  }
}
