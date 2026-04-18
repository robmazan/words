type Listener<T> = (value: T) => void;

export class Store<T> {
  private _value: T;
  private listeners = new Set<Listener<T>>();

  constructor(initial: T) {
    this._value = initial;
  }

  get value(): T {
    return this._value;
  }

  set(next: T): void {
    this._value = next;
    this.listeners.forEach((l) => l(next));
  }

  update(fn: (prev: T) => T): void {
    this.set(fn(this._value));
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

import type { Word, WordProgress, UserProfile } from '../models/types.js';

export const wordsStore = new Store<Word[]>([]);
export const progressStore = new Store<Map<string, WordProgress>>(new Map());
export const profileStore = new Store<UserProfile | null>(null);
