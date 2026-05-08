import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioService } from '../services/audio.service';
import { EqualizerService, EffectsState } from './equalizer.service';

@Component({
  selector: 'app-equalizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './equalizer.component.html',
  styleUrls: ['./equalizer.component.scss']
})
export class EqualizerComponent implements OnInit, OnDestroy {
  customBandfreq: number = 1000;
  customBandQ: number = 1;
  customBandGain: number = 0;

  constructor(
    public audioService: AudioService,
    public eq: EqualizerService
  ) {}

  ngOnInit() {
    // Ativar o equalizador quando o componente for aberto
    if (this.audioService.currentTracks().length > 0) {
      // Primeiro garantir que há uma música carregada
      const audioEl = this.audioService.getAudioElement();
      if (audioEl.src) {
        this.audioService.activateEqualizer();
      }
    }
  }

  ngOnDestroy() {}

  get bands() {
    return this.eq.bands();
  }

  get effects() {
    return this.eq.effects();
  }

  get presets() {
    return this.eq.presets;
  }

  get currentPreset() {
    return this.eq.currentPreset();
  }

  isBypassed() {
    return this.eq.isBypassed();
  }

  onBandChange(index: number, event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.eq.setBandGain(index, value);
  }

  onPresetSelect(presetName: string) {
    this.eq.applyPreset(presetName);
  }

  onBassBoostChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.eq.setBassBoost(value);
  }

  onReverbChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.eq.setReverb(value);
  }

  onVirtualizerChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.eq.setVirtualizer(value);
  }

  onLoudnessChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.eq.setLoudness(checked);
  }

  addCustomBand() {
    this.eq.addCustomBand(this.customBandfreq, this.customBandQ, this.customBandGain);
    this.customBandfreq = 1000;
    this.customBandQ = 1;
    this.customBandGain = 0;
  }

  toggleBypass() {
    this.eq.toggleBypass();
  }

  resetToFlat() {
    this.eq.resetToFlat();
  }

  getFrequencyLabel(freq: number): string {
    if (freq >= 1000) {
      return (freq / 1000) + 'kHz';
    }
    return freq + 'Hz';
  }
}