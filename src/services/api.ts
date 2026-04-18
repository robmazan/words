import type { Word, WordProgress, UserProfile, SessionResult } from '../models/types.js';

class ApiClient {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`API ${path} failed: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  getWords(): Promise<Word[]> {
    return this.request<Word[]>('/api/words');
  }

  getProgress(): Promise<WordProgress[]> {
    return this.request<WordProgress[]>('/api/progress');
  }

  putProgress(results: SessionResult[]): Promise<void> {
    return this.request<void>('/api/progress', {
      method: 'PUT',
      body: JSON.stringify(results),
    });
  }

  getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>('/api/profile');
  }

  putProfile(update: Partial<UserProfile>): Promise<UserProfile> {
    return this.request<UserProfile>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }
}

export const api = new ApiClient();
