import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { VlsFilesystemService } from './filesystem.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private dbName = 'VLS_PLUS_DB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private isNative = Capacitor.isNativePlatform();

  constructor(private fs: VlsFilesystemService) {
    if (!this.isNative) {
      this.initDB();
    }
  }

  private initDB() {
    const request = indexedDB.open(this.dbName, this.dbVersion);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('library')) {
        db.createObjectStore('library', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event: any) => {
      this.db = event.target.result;
    };
  }

  async set(storeName: string, value: any): Promise<void> {
    if (this.isNative) {
      // No Android, salvamos como arquivo na pasta VLSPLUS_TEMP
      const key = value.key || value.id || value.id_local || 'data_' + Date.now();
      await this.fs.writeFile(`${storeName}_${key}.json`, JSON.stringify(value));
      return;
    }
    return this.runTransaction(storeName, 'readwrite', (store) => store.put(value));
  }

  async get(storeName: string, key: any): Promise<any> {
    if (this.isNative) {
      const data = await this.fs.readFile(`${storeName}_${key}.json`);
      return data ? JSON.parse(data) : null;
    }
    return this.runTransaction(storeName, 'readonly', (store) => store.get(key));
  }

  async getAll(storeName: string): Promise<any[]> {
    if (this.isNative) {
      const files = await this.fs.listFiles();
      const results = [];
      for (const file of files) {
        if (file.name.startsWith(storeName)) {
          const data = await this.fs.readFile(file.name);
          if (data) results.push(JSON.parse(data));
        }
      }
      return results;
    }
    return this.runTransaction(storeName, 'readonly', (store) => store.getAll());
  }

  async delete(storeName: string, key: any): Promise<void> {
    if (this.isNative) {
      await this.fs.deleteFile(`${storeName}_${key}.json`);
      return;
    }
    return this.runTransaction(storeName, 'readwrite', (store) => store.delete(key));
  }

  private runTransaction(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        setTimeout(() => {
          this.runTransaction(storeName, mode, operation).then(resolve).catch(reject);
        }, 100);
        return;
      }
      const transaction = this.db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
