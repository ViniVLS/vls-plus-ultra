import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AudioService } from '../services/audio.service';
import { AuthService } from '../services/auth.service';
import { SyncService } from '../services/sync.service';
import { ToastComponent } from '../components/toast/toast.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ToastComponent],
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.scss']
})
export class AppLayoutComponent {
  constructor(
    public audioService: AudioService, 
    public authService: AuthService,
    private syncService: SyncService, // Inicializa o polling
    private router: Router
  ) {}

  isHome(): boolean {
    return this.router.url === '/home';
  }
}