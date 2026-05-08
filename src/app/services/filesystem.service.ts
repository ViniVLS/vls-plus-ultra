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
}
