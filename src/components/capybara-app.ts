import { render, html } from 'lit-html';
import type { TemplateResult } from 'lit-html';
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
    render(html`
      <style>${styles}</style>
      <div class="loader">
        <img src="/animals/capybara.svg" alt="Loading…" />
        <p>Loading Capybara Academy…</p>
      </div>
    `, this.root);

    window.addEventListener('popstate', () => this.renderRoute(location.pathname));
    this.addEventListener('navigate', (e: Event) => {
      const { path } = (e as CustomEvent<{ path: string }>).detail;
      history.pushState({}, '', path);
      this.renderRoute(path);
    });
    this.addEventListener('session-complete', (e: Event) => {
      const { results } = (e as CustomEvent).detail;
      history.pushState({}, '', '/results');
      render(html`
        <style>${styles}</style>
        <results-screen .sessionResults=${results}></results-screen>
      `, this.root);
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
    render(html`
      <style>${styles}</style>
      ${this.resolveRouteTemplate(path)}
    `, this.root);
  }

  private resolveRouteTemplate(path: string): TemplateResult {
    if (path === '/login') return html`<login-page></login-page>`;
    if (path === '/zoo') return html`<zoo-view></zoo-view>`;
    if (path.startsWith('/session/')) {
      const mode = path.split('/')[2];
      return this.gameTemplate(mode);
    }
    if (path === '/results') return html`<results-screen></results-screen>`;
    return html`<session-launcher></session-launcher>`;
  }

  private gameTemplate(mode: string): TemplateResult {
    if (mode === 'flashcard') return html`<flashcard-game></flashcard-game>`;
    if (mode === 'spelling') return html`<spelling-game></spelling-game>`;
    if (mode === 'match') return html`<match-game></match-game>`;
    if (mode === 'quickfire') return html`<quickfire-game></quickfire-game>`;
    return html`<session-launcher></session-launcher>`;
  }
}

customElements.define('capybara-app', CapybaraApp);
