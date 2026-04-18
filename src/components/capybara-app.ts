import { BaseComponent } from './base-component.js';
import styles from './capybara-app.css?raw';
import { getCurrentUser } from '../services/auth.js';
import { api } from '../services/api.js';
import { speech } from '../services/speech.js';
import { wordsStore, progressStore, profileStore } from '../services/store.js';
import { updateStreak } from '../services/session.js';
import './login-page.js';
import './zoo-view.js';
import './session-launcher.js';
import './results-screen.js';
import './games/flashcard-game.js';
import './games/spelling-game.js';
import './games/match-game.js';
import './games/quickfire-game.js';

export class CapybaraApp extends BaseComponent {
  private currentPath = '/';

  connectedCallback(): void {
    this.root.innerHTML = this.loadingTemplate();

    window.addEventListener('popstate', () => this.renderRoute(location.pathname));
    this.addEventListener('navigate', (e: Event) => {
      const { path } = (e as CustomEvent<{ path: string }>).detail;
      history.pushState({}, '', path);
      this.renderRoute(path);
    });
    this.addEventListener('session-complete', (e: Event) => {
      const { results } = (e as CustomEvent).detail;
      history.pushState({}, '', '/results');
      const el = document.createElement('results-screen') as HTMLElement & { sessionResults: unknown };
      this.root.innerHTML = '';
      const style = document.createElement('style');
      style.textContent = this.sharedStyles();
      this.root.appendChild(style);
      this.root.appendChild(el);
      el.sessionResults = results;
    });

    this.boot();
  }

  private async boot(): Promise<void> {
    const user = await getCurrentUser();
    if (!user) {
      history.replaceState({}, '', '/login');
      this.renderRoute('/login');
      return;
    }

    await speech.init();

    try {
      const [words, progressList, profile] = await Promise.all([
        api.getWords(),
        api.getProgress(),
        api.getProfile(),
      ]);

      wordsStore.set(words);

      const progressMap = new Map(progressList.map((p) => [p.wordId, p]));
      progressStore.set(progressMap);

      const streakUpdate = updateStreak(profile);
      const updatedProfile = { ...profile, ...streakUpdate };
      profileStore.set(updatedProfile);

      if (streakUpdate.streak !== profile.streak) {
        api.putProfile(streakUpdate).catch(() => {});
      }
    } catch (err) {
      console.error('Boot failed:', err);
    }

    this.renderRoute(location.pathname === '/login' ? '/' : location.pathname);
  }

  private renderRoute(path: string): void {
    this.currentPath = path;
    this.root.innerHTML = '';

    const styles = this.sharedStyles();
    const style = document.createElement('style');
    style.textContent = styles;
    this.root.appendChild(style);

    const el = this.resolveRoute(path);
    this.root.appendChild(el);
  }

  private resolveRoute(path: string): HTMLElement {
    if (path === '/login') return document.createElement('login-page');
    if (path === '/zoo') return document.createElement('zoo-view');
    if (path.startsWith('/session/')) {
      const mode = path.split('/')[2];
      return this.createGameElement(mode);
    }
    if (path === '/results') return document.createElement('results-screen');
    // default: session launcher / home
    return document.createElement('session-launcher');
  }

  private createGameElement(mode: string): HTMLElement {
    const map: Record<string, string> = {
      flashcard: 'flashcard-game',
      spelling: 'spelling-game',
      match: 'match-game',
      quickfire: 'quickfire-game',
    };
    return document.createElement(map[mode] ?? 'session-launcher');
  }

  private loadingTemplate(): string {
    return `
      <style>${styles}</style>
      <div class="loader">
        <img src="/animals/capybara.svg" alt="Loading…" />
        <p>Loading Capybara Academy…</p>
      </div>
    `;
  }

  private sharedStyles(): string {
    return styles;
  }
}

customElements.define('capybara-app', CapybaraApp);
