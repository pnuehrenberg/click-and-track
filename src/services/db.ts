import { TrackPoint } from '@/types';

const DB_NAME = 'ClickTrackerDB';
const STORE_NAME = 'points';
const DB_VERSION = 1;

export class TrackerDB {
  private db: IDBDatabase | null = null;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async savePoints(points: TrackPoint[]): Promise<void> {
    if (!this.db) await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Clear existing for simplicity in this session-based app approach
      // In a more complex app, we might diff, but full sync is safer here
      store.clear(); 
      
      points.forEach(point => store.put(point));
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async loadPoints(): Promise<TrackPoint[]> {
    if (!this.db) await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as TrackPoint[]);
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new TrackerDB();
