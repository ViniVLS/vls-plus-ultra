import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AudioService } from '../services/audio.service';
import { AuthService } from '../services/auth.service';
import { SyncService } from '../services/sync.service';
import { ToastComponent } from '../components/toast/toast.component';
import { DialogComponent } from '../components/dialog/dialog.component';
import { VERSION_DISPLAY } from '../version';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ToastComponent, DialogComponent],
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.scss']
})
export class AppLayoutComponent {
  version = VERSION_DISPLAY;

  constructor(
    public audioService: AudioService, 
    public authService: AuthService,
    private syncService: SyncService, // Inicializa o polling
    private router: Router
  ) {
    console.log(`%c VLS PLUS %c ${this.version} %c`, 'background:#ff4b4b;color:#fff;padding:2px;border-radius:3px 0 0 3px;', 'background:#333;color:#fff;padding:2px;border-radius:0 3px 3px 0;', '');
  }

  isHome(): boolean {
    return this.router.url === '/home';
  }
}