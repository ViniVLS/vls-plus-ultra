import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AudioService } from '../services/audio.service';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './browse.component.html',
  styleUrls: ['./browse.component.scss']
})
export class BrowseComponent implements OnInit {
  searchQuery: string = '';
  searchResults: any[] = [];
  isSearching: boolean = false;

  constructor(
    public audioService: AudioService
  ) {}

  ngOnInit() {}

  onSearch() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    const query = this.searchQuery.toLowerCase();
    const tracks = this.audioService.currentTracks();

    this.searchResults = tracks.filter(track =>
      track.name.toLowerCase().includes(query)
    );

    this.isSearching = false;
  }

  selectTrack(index: number) {
    const allTracks = this.audioService.currentTracks();
    const track = this.searchResults[index];
    const originalIndex = allTracks.findIndex(t => t.name === track.name);

    if (originalIndex > -1) {
      this.audioService.selectTrack(originalIndex);
      this.audioService.play();
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
  }
}