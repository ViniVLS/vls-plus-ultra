import { Injectable, signal } from '@angular/core';
import { DatabaseService } from '../services/database.service';

export interface EqualizerBand {
  frequency: number;
  gain: number;
  q: number;
  type: BiquadFilterType;
}

export interface EffectsState {
  bassBoost: number;
  virtualizer: number;
  reverb: number;
  loudness: boolean;
  compressor: { threshold: number; ratio: number; attack: number; release: number };
}

export interface EqualizerPreset {
  name: string;
  bands: number[];
}

@Injectable({ providedIn: 'root' })
export class EqualizerService {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private compressorNode: DynamicsCompressorNode | null = null;
  private bassBoostNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private initialized = signal(false);
  private bypassed = signal(false);

  // Frequências padrão para um equalizador de 10 bandas
  private readonly defaultFreqs = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

  readonly bands = signal<EqualizerBand[]>(
    this.defaultFreqs.map((freq, i) => ({
      frequency: freq,
      gain: 0,
      q: 1,
      type: i === 0 ? 'lowshelf' : i === 9 ? 'highshelf' : 'peaking'
    }))
  );

  readonly effects = signal<EffectsState>({
    bassBoost: 0, virtualizer: 0, reverb: 0, loudness: false,
    compressor: { threshold: -24, ratio: 12, attack: 0.003, release: 0.25 }
  });

  readonly currentPreset = signal<string>('Flat');

  readonly presets: EqualizerPreset[] = [
    { name: 'Flat', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: 'Rock', bands: [4, 3, 0, -1, 0, 2, 3, 4, 4, 3] },
    { name: 'Pop', bands: [-1, 0, 2, 4, 5, 3, 0, -1, -2, -3] },
    { name: 'Jazz', bands: [3, 2, 0, 1, 2, 2, 1, 2, 3, 2] },
    { name: 'Classical', bands: [4, 3, 2, 1, 0, -1, -1, 0, 2, 3] },
    { name: 'Hip-Hop', bands: [6, 5, 3, 0, -1, 0, 2, 3, 4, 3] },
    { name: 'Electronic', bands: [5, 4, 1, 0, -1, 0, 3, 4, 5, 4] },
    { name: 'Vocal', bands: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2] },
    { name: 'Bass/Sub', bands: [6, 4, 2, 0, 0, 0, 0, 0, 0, 0] },
    { name: 'Treble', bands: [0, 0, 0, 0, 0, 2, 4, 5, 6, 6] }
  ];

  isInitialized() { return this.initialized(); }
  isBypassed() { return this.bypassed(); }  constructor(private db: DatabaseService) {}

  activateWithAudio(audioElement: HTMLAudioElement, providedContext?: AudioContext) {
    if (this.initialized()) return;
    this.audioElement = audioElement;
    
    try {
      this.audioContext = providedContext || new AudioContext();
      
      if (!this.sourceNode) {
        this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.createFilterChain();
      this.initialized.set(true);
      this.loadFromStorage();
    } catch (e) { 
      console.error('Equalizer initialization failed:', e);
      if (this.sourceNode) {
        this.createFilterChain();
        this.initialized.set(true);
      }
    }
  }

  private createFilterChain() {
    if (!this.audioContext || !this.sourceNode) return;
    const ctx = this.audioContext;
    
    this.sourceNode.disconnect();

    this.filterNodes = [];
    let prev: AudioNode = this.sourceNode;

    const currentBands = this.bands();
    for (let i = 0; i < 10; i++) {
      const config = currentBands[i];
      const filter = ctx.createBiquadFilter();
      filter.type = config.type;
      filter.frequency.value = config.frequency;
      filter.Q.value = config.q;
      filter.gain.value = config.gain;
      
      prev.connect(filter);
      this.filterNodes.push(filter);
      prev = filter;
    }

    this.compressorNode = ctx.createDynamicsCompressor();
    const compConfig = this.effects().compressor;
    this.compressorNode.threshold.value = compConfig.threshold;
    this.compressorNode.ratio.value = compConfig.ratio;
    this.compressorNode.attack.value = compConfig.attack;
    this.compressorNode.release.value = compConfig.release;
    
    prev.connect(this.compressorNode);
    prev = this.compressorNode;

    this.bassBoostNode = ctx.createGain();
    this.setBassBoost(this.effects().bassBoost);
    
    prev.connect(this.bassBoostNode);
    prev = this.bassBoostNode;

    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    
    prev.connect(this.analyserNode);
    prev = this.analyserNode;

    if (this.bypassed()) {
      this.sourceNode.disconnect();
      this.sourceNode.connect(ctx.destination);
    } else {
      prev.connect(ctx.destination);
    }
  }

  setBandGain(index: number, gain: number) {
    if (index >= 0 && index < this.filterNodes.length) {
      const now = this.audioContext?.currentTime || 0;
      this.filterNodes[index].gain.setTargetAtTime(gain, now, 0.05);
      
      const b = [...this.bands()];
      b[index].gain = gain;
      this.bands.set(b);
      this.saveToStorage();
    }
  }

  applyPreset(name: string) {
    const p = this.presets.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (p) {
      p.bands.forEach((gain, i) => this.setBandGain(i, gain));
      this.currentPreset.set(p.name);
    }
  }

  setBassBoost(level: number) {
    if (this.bassBoostNode) {
      const now = this.audioContext?.currentTime || 0;
      const gainValue = 1 + (level / 6) * 1; 
      this.bassBoostNode.gain.setTargetAtTime(gainValue, now, 0.1);
    }
    this.effects.update(e => ({ ...e, bassBoost: level }));
    this.saveToStorage();
  }

  setReverb(level: number) { 
    this.effects.update(e => ({ ...e, reverb: level })); 
    this.saveToStorage();
  }
  
  setVirtualizer(level: number) { 
    this.effects.update(e => ({ ...e, virtualizer: level })); 
    this.saveToStorage();
  }
  
  setLoudness(enabled: boolean) { 
    this.effects.update(e => ({ ...e, loudness: enabled })); 
    this.saveToStorage();
  }

  toggleBypass() {
    if (!this.audioContext || !this.sourceNode) return;
    const isNowBypassed = !this.bypassed();
    this.bypassed.set(isNowBypassed);
    
    this.sourceNode.disconnect();
    
    if (isNowBypassed) {
      this.sourceNode.connect(this.audioContext.destination);
    } else {
      if (this.filterNodes.length > 0) {
        this.sourceNode.connect(this.filterNodes[0]);
      } else {
        this.sourceNode.connect(this.audioContext.destination);
      }
    }
  }

  getFrequencyData() {
    if (!this.analyserNode) return new Uint8Array(0);
    const d = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(d);
    return d;
  }

  addCustomBand(freq: number, q: number, gain: number) {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const filter = ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = freq;
    filter.Q.value = q;
    filter.gain.value = gain;

    if (this.filterNodes.length > 0) {
      const lastFilter = this.filterNodes[this.filterNodes.length - 1];
      lastFilter.disconnect();
      lastFilter.connect(filter);
      if (this.compressorNode) {
        filter.connect(this.compressorNode);
      }
    }
    
    this.filterNodes.push(filter);
    const b = [...this.bands()];
    b.push({ frequency: freq, gain, q, type: 'peaking' });
    this.bands.set(b);
    this.saveToStorage();
  }

  resetToFlat() { 
    this.applyPreset('Flat'); 
    this.setBassBoost(0); 
  }

  private async saveToStorage() {
    const state = { 
      bands: this.bands(), 
      effects: this.effects(), 
      preset: this.currentPreset() 
    };
    await this.db.set('settings', { key: 'equalizer_state', data: state });
  }

  private async loadFromStorage() {
    try {
      const s = await this.db.get('settings', 'equalizer_state');
      if (s?.data) {
        const st = s.data;
        if (st.bands) { 
          this.bands.set(st.bands); 
          st.bands.forEach((b: EqualizerBand, i: number) => { 
            if (this.filterNodes[i]) this.filterNodes[i].gain.value = b.gain; 
          }); 
        }
        if (st.effects?.bassBoost !== undefined) this.setBassBoost(st.effects.bassBoost);
        if (st.preset) this.currentPreset.set(st.preset);
      }
    } catch (e) {}
  }

  turnOff() {
    this.initialized.set(false);
    this.sourceNode?.disconnect();
    this.filterNodes.forEach(n => n.disconnect());
    this.compressorNode?.disconnect();
    this.bassBoostNode?.disconnect();
    this.analyserNode?.disconnect();
    
    if (this.sourceNode && this.audioContext) {
      this.sourceNode.connect(this.audioContext.destination);
    }

    this.filterNodes = []; 
    this.compressorNode = null;
    this.bassBoostNode = null; 
    this.analyserNode = null;
  }
}