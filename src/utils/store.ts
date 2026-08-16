import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config';
import { logger } from './logger';

export interface StoreData {
  [collection: string]: Record<string, unknown>;
}

/**
 * Tiny JSON-file backed key/value store.
 * Keys are per-guild (or global when guildId is '').
 */
class JSONStore extends EventEmitter {
  private data: StoreData = {};
  private readonly dir = config.dataDir;
  private readonly file = join(this.dir, 'store.json');

  constructor() {
    super();
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
    if (existsSync(this.file)) {
      try {
        this.data = JSON.parse(readFileSync(this.file, 'utf-8')) as StoreData;
      } catch (err) {
        logger.warn('Failed to parse store.json, starting fresh.', err);
        this.data = {};
      }
    }
  }

  private collection(name: string): Record<string, unknown> {
    if (!this.data[name]) this.data[name] = {};
    return this.data[name];
  }

  private persist(): void {
    try {
      writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Failed to write store.json', err);
    }
  }

  get<T>(collection: string, key: string): T | null {
    const c = this.data[collection];
    if (!c) return null;
    return (c[key] as T) ?? null;
  }

  getAll<T>(collection: string): Record<string, T> {
    const c = this.data[collection];
    if (!c) return {};
    return c as Record<string, T>;
  }

  set(collection: string, key: string, value: unknown): void {
    this.collection(collection)[key] = value;
    this.persist();
    this.emit('change', collection, key, value);
  }

  setAll(collection: string, entries: Record<string, unknown>): void {
    this.data[collection] = entries;
    this.persist();
    this.emit('change', collection);
  }

  delete(collection: string, key: string): boolean {
    const c = this.data[collection];
    if (!c || !(key in c)) return false;
    delete c[key];
    this.persist();
    this.emit('change', collection, key);
    return true;
  }

  clear(collection: string): void {
    delete this.data[collection];
    this.persist();
  }
}

export const store = new JSONStore();

/** Key scoped to a guild (use guildId '' for global keys). */
export const key = (guildId: string, ...parts: string[]): string =>
  `${guildId}:${parts.join(':')}`;
