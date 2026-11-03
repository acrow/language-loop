import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Group, Playlist, Sentence, SettingRecord } from '@/types/models';

const DB_NAME = 'LanguageLoopDB';
const DB_VERSION = 2;

export interface LanguageLoopDB extends DBSchema {
  playlists: {
    key: number;
    value: Playlist;
    indexes: { name: string };
  };
  sentences: {
    key: number;
    value: Sentence;
    indexes: { playlistId: number };
  };
  settings: {
    key: string;
    value: SettingRecord;
  };
  groups: {
    key: number;
    value: Group;
    indexes: { order: number };
  };
}

let dbPromise: Promise<IDBPDatabase<LanguageLoopDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<LanguageLoopDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LanguageLoopDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('playlists')) {
          const store = db.createObjectStore('playlists', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('name', 'name');
        }
        if (!db.objectStoreNames.contains('sentences')) {
          const store = db.createObjectStore('sentences', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('playlistId', 'playlistId');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('groups')) {
          const store = db.createObjectStore('groups', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('order', 'order');
        }
      }
    });
  }
  return dbPromise;
}

export async function closeDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
