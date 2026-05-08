import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  message: string;
  type: ToastType;
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSignal = signal<Toast[]>([]);
  public toasts = this.toastsSignal.asReadonly();

  show(message: string, type: ToastType = 'info') {
    const id = Date.now();
    const newToast: Toast = { message, type, id };
    
    this.toastsSignal.update(current => [...current, newToast]);

    // Auto-remove após 3.5 segundos
    setTimeout(() => {
      this.remove(id);
    }, 3500);
  }

  success(message: string) { this.show(message, 'success'); }
  error(message: string) { this.show(message, 'error'); }
  info(message: string) { this.show(message, 'info'); }
  warning(message: string) { this.show(message, 'warning'); }

  remove(id: number) {
    this.toastsSignal.update(current => current.filter(t => t.id !== id));
  }
}
