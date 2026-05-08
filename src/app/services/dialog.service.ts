import { Injectable, signal } from '@angular/core';

export interface DialogOptions {
  title: string;
  message: string;
  type: 'confirm' | 'prompt';
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  resolve: (value: any) => void;
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private activeDialogSignal = signal<DialogOptions | null>(null);
  public activeDialog = this.activeDialogSignal.asReadonly();

  confirm(title: string, message: string, confirmText = 'Sim', cancelText = 'Cancelar'): Promise<boolean> {
    return new Promise((resolve) => {
      this.activeDialogSignal.set({
        title,
        message,
        type: 'confirm',
        confirmText,
        cancelText,
        resolve
      });
    });
  }

  prompt(title: string, message: string, defaultValue = '', placeholder = 'Digite aqui...'): Promise<string | null> {
    return new Promise((resolve) => {
      this.activeDialogSignal.set({
        title,
        message,
        type: 'prompt',
        defaultValue,
        placeholder,
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        resolve
      });
    });
  }

  close(result: any) {
    const current = this.activeDialogSignal();
    if (current) {
      current.resolve(result);
      this.activeDialogSignal.set(null);
    }
  }
}
