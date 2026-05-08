import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AudioService } from '../services/audio.service';
import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  activeTab = signal<string>('NOW_PLAYING');

  constructor(
    public audioService: AudioService,
    public authService: AuthService,
    private supabase: SupabaseService
  ) {}

  ngOnInit() {
    // Restaurar estado se necessário
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
  }

  formatTime(seconds: number): string {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  togglePlayPause(): void {
    this.audioService.togglePlayPause();
  }

  seek(event: any): void {
    this.audioService.seek(event);
  }

  next(): void {
    this.audioService.next();
  }

  previous(): void {
    this.audioService.previous();
  }

  selectTrack(index: number) {
    this.audioService.selectTrack(index);
  }
}