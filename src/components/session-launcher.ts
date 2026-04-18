import { render, html, nothing } from 'lit-html';
import { BaseComponent } from './base-component.js';
import styles from './session-launcher.css?raw';
import { wordsStore, profileStore, progressStore } from '../services/store.js';
import { getAnimalState, xpToLevel, levelThreshold } from '../services/session.js';
import { getLogoutUrl } from '../services/auth.js';
import type { GameMode } from '../models/types.js';

const GAME_MODES: { id: GameMode; label: string; emoji: string; desc: string }[] = [
  { id: 'flashcard', label: 'Flash Cards', emoji: '🃏', desc: 'See Hungarian, type English' },
  { id: 'spelling', label: 'Spelling Bee', emoji: '🔊', desc: 'Hear the word, spell it' },
  { id: 'match', label: 'Match Game', emoji: '🧩', desc: 'Flip cards to find pairs' },
  { id: 'quickfire', label: 'Quick Fire', emoji: '⚡', desc: 'Race against the clock' },
];

export class SessionLauncher extends BaseComponent {
  connectedCallback(): void {
    this.subscribe(wordsStore, () => this.render());
    this.subscribe(profileStore, () => this.render());
    this.subscribe(progressStore, () => this.render());
  }

  private render(): void {
    const words = wordsStore.value;
    const profile = profileStore.value;
    const progress = progressStore.value;

    const befriended = [...progress.values()].filter((p) => p.masteryLevel >= 4).length;
    const level = profile ? xpToLevel(profile.xp) : 0;
    const xp = profile?.xp ?? 0;
    const thisLevelXp = levelThreshold(level);
    const nextLevelXp = levelThreshold(level + 1);
    const xpProgress = nextLevelXp > thisLevelXp
      ? ((xp - thisLevelXp) / (nextLevelXp - thisLevelXp)) * 100
      : 100;

    render(html`
      <style>${styles}</style>

      <header>
        <div class="logo">
          <img src="/animals/capybara.svg" alt="" />
          Capybara Academy
        </div>
        <div class="header-right">
          ${profile ? html`<span class="streak">🔥 ${profile.streak}</span>` : nothing}
          ${profile ? html`<span class="level-badge">Lv ${level}</span>` : nothing}
          <a class="logout-btn" href="${getLogoutUrl()}">Sign out</a>
        </div>
      </header>

      <main>
        ${words.length === 0
          ? this.noWordsTemplate()
          : this.contentTemplate(words.length, befriended, xp, xpProgress)}
      </main>
    `, this.root);
  }

  private contentTemplate(
    wordCount: number,
    befriended: number,
    xp: number,
    xpProgress: number,
  ) {
    return html`
      <div class="hero">
        <h2>Ready to learn? 🌿</h2>
        <p>${wordCount} words in your list — ${befriended} animals befriended</p>
        <div class="xp-bar-wrap"><div class="xp-bar" style="width:${xpProgress.toFixed(1)}%"></div></div>
        <p style="font-size:0.8rem;color:var(--color-text-muted);font-weight:600">${xp} XP</p>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-value">${wordCount}</div>
          <div class="stat-label">Words</div>
        </div>
        <div class="stat">
          <div class="stat-value">${befriended}</div>
          <div class="stat-label">Befriended</div>
        </div>
        <div class="stat">
          <div class="stat-value">${wordCount - befriended}</div>
          <div class="stat-label">To Master</div>
        </div>
      </div>

      <p class="modes-title">Choose a game mode:</p>
      <div class="modes">
        ${GAME_MODES.map((m) => html`
          <button class="mode-btn" @click=${() => this.navigate(`/session/${m.id}`)}>
            <span class="mode-emoji">${m.emoji}</span>
            <span class="mode-info">
              <span class="mode-label">${m.label}</span>
              <span class="mode-desc">${m.desc}</span>
            </span>
          </button>
        `)}
      </div>

      <button class="zoo-link" @click=${() => this.navigate('/zoo')}>
        🦎 Visit your Zoo (${befriended}/${wordCount})
      </button>
    `;
  }

  private noWordsTemplate() {
    return html`
      <div class="no-words">
        <p style="font-size:3rem">🌱</p>
        <p style="font-size:1.1rem;margin-top:12px">No words loaded yet!</p>
        <p style="margin-top:8px">Ask a parent to upload a vocabulary.csv file.</p>
      </div>
    `;
  }
}

customElements.define('session-launcher', SessionLauncher);
