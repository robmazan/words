import { BaseComponent } from './base-component.js';
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

    this.root.innerHTML = `
      <style>
        :host {
          display: block;
          min-height: 100vh;
          background: linear-gradient(160deg, var(--color-surface) 60%, var(--color-surface-alt) 100%);
          font-family: var(--font-body);
        }

        header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 900;
          font-size: 1.2rem;
          color: var(--color-primary);
        }

        .logo img { width: 36px; }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .streak {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--color-accent);
        }

        .level-badge {
          background: var(--color-primary);
          color: white;
          border-radius: var(--radius-pill);
          padding: 4px 12px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .logout-btn {
          background: none;
          border: 1px solid var(--color-text-muted);
          border-radius: var(--radius-pill);
          padding: 4px 12px;
          font-family: var(--font-body);
          font-size: 0.8rem;
          color: var(--color-text-muted);
          cursor: pointer;
          text-decoration: none;
        }

        .logout-btn:hover { color: var(--color-error); border-color: var(--color-error); }

        main {
          max-width: 680px;
          margin: 0 auto;
          padding: 32px 24px 64px;
        }

        .hero {
          text-align: center;
          margin-bottom: 32px;
          animation: fade-in 0.4s ease both;
        }

        .hero h2 {
          font-size: 1.7rem;
          font-weight: 900;
          color: var(--color-primary-dark);
          margin-bottom: 4px;
        }

        .hero p {
          color: var(--color-text-muted);
          font-weight: 600;
        }

        .xp-bar-wrap {
          background: var(--color-surface-alt);
          border-radius: var(--radius-pill);
          height: 12px;
          margin: 12px auto;
          max-width: 300px;
          overflow: hidden;
        }

        .xp-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary-light), var(--color-accent));
          border-radius: var(--radius-pill);
          transition: width 0.6s ease;
          width: ${xpProgress.toFixed(1)}%;
        }

        .stats {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .stat {
          background: white;
          border-radius: var(--radius-card);
          padding: 14px 20px;
          text-align: center;
          box-shadow: var(--shadow-card);
          min-width: 90px;
        }

        .stat-value {
          font-size: 1.6rem;
          font-weight: 900;
          color: var(--color-primary);
          line-height: 1;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: 600;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .modes-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--color-text);
          margin-bottom: 12px;
        }

        .modes {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .mode-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          background: white;
          border: 2px solid transparent;
          border-radius: var(--radius-card);
          padding: 16px 20px;
          cursor: pointer;
          font-family: var(--font-body);
          text-align: left;
          box-shadow: var(--shadow-card);
          transition: border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
        }

        .mode-btn:hover {
          border-color: var(--color-primary-light);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lift);
        }

        .mode-emoji { font-size: 1.8rem; }

        .mode-info { flex: 1; }

        .mode-label {
          font-size: 1rem;
          font-weight: 800;
          color: var(--color-text);
          display: block;
        }

        .mode-desc {
          font-size: 0.82rem;
          color: var(--color-text-muted);
          font-weight: 600;
        }

        .zoo-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--color-surface-alt);
          border: 2px dashed var(--color-primary-light);
          border-radius: var(--radius-card);
          padding: 14px;
          font-weight: 700;
          color: var(--color-primary);
          cursor: pointer;
          font-family: var(--font-body);
          font-size: 0.95rem;
          transition: background var(--transition-fast);
        }

        .zoo-link:hover { background: var(--color-surface); }

        .no-words {
          text-align: center;
          padding: 48px 24px;
          color: var(--color-text-muted);
          font-weight: 600;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      </style>

      <header>
        <div class="logo">
          <img src="/animals/capybara.svg" alt="" />
          Capybara Academy
        </div>
        <div class="header-right">
          ${profile ? `<span class="streak">🔥 ${profile.streak}</span>` : ''}
          ${profile ? `<span class="level-badge">Lv ${level}</span>` : ''}
          <a class="logout-btn" href="${getLogoutUrl()}">Sign out</a>
        </div>
      </header>

      <main>
        ${words.length === 0 ? this.noWordsTemplate() : this.contentTemplate(words.length, befriended, profile?.xp ?? 0, xpProgress)}
      </main>
    `;

    this.root.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode as GameMode;
        this.navigate(`/session/${mode}`);
      });
    });

    this.root.querySelector('.zoo-link')?.addEventListener('click', () => {
      this.navigate('/zoo');
    });
  }

  private contentTemplate(
    wordCount: number,
    befriended: number,
    xp: number,
    xpProgress: number,
  ): string {
    return `
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
        ${GAME_MODES.map((m) => `
          <button class="mode-btn" data-mode="${m.id}">
            <span class="mode-emoji">${m.emoji}</span>
            <span class="mode-info">
              <span class="mode-label">${m.label}</span>
              <span class="mode-desc">${m.desc}</span>
            </span>
          </button>
        `).join('')}
      </div>

      <button class="zoo-link">🦎 Visit your Zoo (${befriended}/${wordCount})</button>
    `;
  }

  private noWordsTemplate(): string {
    return `
      <div class="no-words">
        <p style="font-size:3rem">🌱</p>
        <p style="font-size:1.1rem;margin-top:12px">No words loaded yet!</p>
        <p style="margin-top:8px">Ask a parent to upload a vocabulary.csv file.</p>
      </div>
    `;
  }
}

customElements.define('session-launcher', SessionLauncher);
