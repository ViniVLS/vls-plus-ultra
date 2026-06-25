import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class VlsFilesystemService {
  private readonly ROOT_DIR = 'VLSPLUS_TEMP';

  constructor() {
    this.init();
  }

  private async init() {
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.mkdir({
          path: this.ROOT_DIR,
          directory: Directory.Data,
          recursive: true
        });
        console.log('VLSPLUS_TEMP directory created/verified');
      } catch (e) {
        console.log('Directory might already exist');
      }
    }
  }

  async writeFile(path: string, data: string) {
    if (!Capacitor.isNativePlatform()) {
      localStorage.setItem(`vls_file_${path}`, data);
      return;
    }

    await Filesystem.writeFile({
      path: `${this.ROOT_DIR}/${path}`,
      data: data,
      directory: Directory.Data,
      encoding: Encoding.UTF8
    });
  }

  async readFile(path: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      return localStorage.getItem(`vls_file_${path}`);
    }

    try {
      const contents = await Filesystem.readFile({
        path: `${this.ROOT_DIR}/${path}`,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
      return contents.data as string;
    } catch (e) {
      return null;
    }
  }

  async listFiles() {
    if (!Capacitor.isNativePlatform()) return [];
    
    const result = await Filesystem.readdir({
      path: this.ROOT_DIR,
      directory: Directory.Data
    });
    return result.files;
  }

  async deleteFile(path: string) {
    if (!Capacitor.isNativePlatform()) {
      localStorage.removeItem(`vls_file_${path}`);
      return;
    }

    try {
      await Filesystem.deleteFile({
        path: `${this.ROOT_DIR}/${path}`,
        directory: Directory.Data
      });
      console.log('File deleted from native storage:', path);
    } catch (e) {
      console.warn('Error deleting file from native storage:', path, e);
    }
  }

  async saveNativeAudio(name: string, file: File): Promise<string> {
    if (!Capacitor.isNativePlatform()) return '';
    
    try {
      await Filesystem.mkdir({
        path: `${this.ROOT_DIR}/music`,
        directory: Directory.Data,
        recursive: true
      });
    } catch (e) {}

    // Converter o File do navegador para string base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const safeName = name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const destPath = `${this.ROOT_DIR}/music/${safeName}`;

    await Filesystem.writeFile({
      path: destPath,
      data: base64Data,
      directory: Directory.Data
    });

    const uriResult = await Filesystem.getUri({
      path: destPath,
      directory: Directory.Data
    });

    return Capacitor.convertFileSrc(uriResult.uri);
  }
}

