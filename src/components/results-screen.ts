import { BaseComponent } from './base-component.js';
import { wordsStore, progressStore, profileStore } from '../services/store.js';
import { api } from '../services/api.js';
import {
  applySessionResults,
  calculateSessionXP,
  xpToLevel,
  levelThreshold,
  checkNewBadges,
  updateStreak,
  getAnimalForWord,
  getAnimalState,
} from '../services/session.js';
import type { SessionResult } from '../models/types.js';
import { BADGES } from '../models/badges.js';

export class ResultsScreen extends BaseComponent {
  private results: SessionResult[] = [];
  private saving = false;

  set sessionResults(results: SessionResult[]) {
    this.results = results;
    this.processAndRender();
  }

  connectedCallback(): void {
    // Results may be set via property before connectedCallback or after —
    // listen for the session-complete event as a fallback when navigated here directly.
    if (this.results.length > 0) {
      this.processAndRender();
    } else {
      this.root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:var(--font-body);font-size:1.1rem;color:var(--color-text-muted)">Loading results…</div>`;
    }
  }

  private async processAndRender(): Promise<void> {
    if (this.saving) return;
    this.saving = true;

    const words = wordsStore.value;
    const oldProgress = progressStore.value;
    const oldProfile = profileStore.value;

    // Update progress optimistically
    const newProgress = applySessionResults(this.results, oldProgress);
    progressStore.set(newProgress);

    const xpEarned = calculateSessionXP(this.results);
    const newXP = (oldProfile?.xp ?? 0) + xpEarned;
    const oldLevel = xpToLevel(oldProfile?.xp ?? 0);
    const newLevel = xpToLevel(newXP);
    const levelUp = newLevel > oldLevel;

    const streakUpdate = updateStreak(oldProfile ?? { streak: 0, lastLoginDate: '' });
    const newBadges = checkNewBadges(
      { badges: oldProfile?.badges ?? [], streak: streakUpdate.streak },
      newProgress,
      this.results,
      words.length,
    );

    const updatedProfile = {
      ...(oldProfile ?? { userId: '', level: 0, badges: [] }),
      xp: newXP,
      level: newLevel,
      streak: streakUpdate.streak,
      lastLoginDate: streakUpdate.lastLoginDate,
      badges: [...(oldProfile?.badges ?? []), ...newBadges],
    };
    profileStore.set(updatedProfile);

    // Persist to API
    Promise.all([
      api.putProgress(this.results),
      api.putProfile(updatedProfile),
    ]).catch((err) => console.error('Save failed:', err));

    // Build list of newly befriended animals
    const newlyBefriended = words.filter((w) => {
      const was = getAnimalState(oldProgress.get(w.id));
      const now = getAnimalState(newProgress.get(w.id));
      return was !== 'befriended' && now === 'befriended';
    });

    const correct = this.results.filter((r) => r.correct).length;
    const wrong = this.results.length - correct;
    const isPerfect = wrong === 0;

    const xpFrom = levelThreshold(oldLevel);
    const xpTo = levelThreshold(newLevel + 1);
    const xpBarFrom = Math.max(0, ((oldProfile?.xp ?? 0) - xpFrom) / (xpTo - xpFrom)) * 100;
    const xpBarTo = Math.max(0, (newXP - levelThreshold(newLevel)) / (levelThreshold(newLevel + 1) - levelThreshold(newLevel))) * 100;

    this.root.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(160deg, var(--color-surface) 60%, var(--color-surface-alt) 100%);
          font-family: var(--font-body);
          padding: 32px 24px 64px;
        }

        .trophy {
          font-size: 4rem;
          animation: pop-in 0.5s ease both;
          margin-bottom: 8px;
        }

        h1 {
          font-size: 1.8rem;
          font-weight: 900;
          color: var(--color-primary-dark);
          margin-bottom: 4px;
          animation: fade-in 0.4s 0.1s ease both;
        }

        .subtitle {
          color: var(--color-text-muted);
          font-weight: 600;
          margin-bottom: 24px;
          animation: fade-in 0.4s 0.15s ease both;
        }

        .score-row {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          justify-content: center;
          animation: fade-in 0.4s 0.2s ease both;
        }

        .score-card {
          background: white;
          border-radius: var(--radius-card);
          box-shadow: var(--shadow-card);
          padding: 16px 24px;
          text-align: center;
          min-width: 90px;
        }

        .score-val {
          font-size: 2rem;
          font-weight: 900;
          line-height: 1;
        }
        .score-val.correct { color: var(--color-success); }
        .score-val.wrong   { color: var(--color-error); }
        .score-val.xp      { color: var(--color-accent); }

        .score-lbl {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 4px;
        }

        .xp-section {
          width: 100%;
          max-width: 400px;
          margin-bottom: 24px;
          animation: fade-in 0.4s 0.3s ease both;
        }

        .xp-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text-muted);
          margin-bottom: 6px;
        }

        .xp-bar-wrap {
          background: var(--color-surface-alt);
          border-radius: var(--radius-pill);
          height: 14px;
          overflow: hidden;
        }

        .xp-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary-light), var(--color-accent));
          border-radius: var(--radius-pill);
          --xp-from: ${xpBarFrom.toFixed(1)}%;
          --xp-to: ${xpBarTo.toFixed(1)}%;
          width: ${xpBarTo.toFixed(1)}%;
          animation: xp-fill 1s 0.5s ease both;
        }

        .level-up {
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
          color: white;
          border-radius: var(--radius-pill);
          padding: 8px 20px;
          font-weight: 800;
          font-size: 1rem;
          text-align: center;
          margin-bottom: 16px;
          animation: pop-in 0.4s 0.8s ease both;
          opacity: 0;
          animation-fill-mode: both;
        }

        .animals-section {
          width: 100%;
          max-width: 480px;
          margin-bottom: 24px;
          animation: fade-in 0.4s 0.4s ease both;
        }

        .animals-section h2 {
          font-size: 1rem;
          font-weight: 800;
          color: var(--color-text);
          margin-bottom: 12px;
        }

        .animals-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .animal-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #d1fae5;
          border: 2px solid var(--color-success);
          border-radius: var(--radius-pill);
          padding: 6px 12px;
          font-weight: 700;
          font-size: 0.85rem;
          color: #065f46;
          animation: pop-in 0.3s ease both;
        }

        .animal-chip img {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        .badges-section {
          width: 100%;
          max-width: 480px;
          margin-bottom: 24px;
          animation: fade-in 0.4s 0.5s ease both;
        }

        .badges-section h2 {
          font-size: 1rem;
          font-weight: 800;
          color: var(--color-text);
          margin-bottom: 12px;
        }

        .badge-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fef3c7;
          border: 2px solid var(--color-accent);
          border-radius: var(--radius-pill);
          padding: 6px 14px;
          font-weight: 700;
          font-size: 0.9rem;
          color: #92400e;
          margin-right: 8px;
          margin-bottom: 8px;
          animation: pop-in 0.3s ease both;
        }

        .btn-row {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          flex-wrap: wrap;
          justify-content: center;
          animation: fade-in 0.4s 0.6s ease both;
        }

        .btn-primary {
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: var(--radius-pill);
          padding: 14px 28px;
          font-family: var(--font-body);
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: background var(--transition-fast), transform var(--transition-fast);
        }
        .btn-primary:hover { background: var(--color-primary-dark); transform: scale(1.03); }

        .btn-secondary {
          background: white;
          color: var(--color-primary);
          border: 2px solid var(--color-primary-light);
          border-radius: var(--radius-pill);
          padding: 12px 24px;
          font-family: var(--font-body);
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: border-color var(--transition-fast);
        }
        .btn-secondary:hover { border-color: var(--color-primary); }

        @keyframes pop-in {
          0%  { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.08); }
          100%{ transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes xp-fill {
          from { width: var(--xp-from); }
          to   { width: var(--xp-to); }
        }
      </style>

      <div class="trophy">${isPerfect ? '🏆' : correct > wrong ? '⭐' : '💪'}</div>
      <h1>${isPerfect ? 'Perfect!' : correct > wrong ? 'Great job!' : 'Keep going!'}</h1>
      <p class="subtitle">${this.results.length} words practised</p>

      <div class="score-row">
        <div class="score-card">
          <div class="score-val correct">${correct}</div>
          <div class="score-lbl">Correct</div>
        </div>
        <div class="score-card">
          <div class="score-val wrong">${wrong}</div>
          <div class="score-lbl">Wrong</div>
        </div>
        <div class="score-card">
          <div class="score-val xp">+${xpEarned}</div>
          <div class="score-lbl">XP</div>
        </div>
      </div>

      ${levelUp ? `<div class="level-up">🎉 Level Up! You're now Level ${newLevel}!</div>` : ''}

      <div class="xp-section">
        <div class="xp-label">
          <span>Level ${newLevel}</span>
          <span>${newXP} XP</span>
        </div>
        <div class="xp-bar-wrap"><div class="xp-bar"></div></div>
      </div>

      ${newlyBefriended.length > 0 ? `
        <div class="animals-section">
          <h2>🐾 New animal friends!</h2>
          <div class="animals-row">
            ${newlyBefriended.map((w) => `
              <div class="animal-chip">
                <img src="/animals/${getAnimalForWord(w.index)}.svg" alt="" />
                ${w.english}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${newBadges.length > 0 ? `
        <div class="badges-section">
          <h2>🏅 New badges!</h2>
          ${newBadges.map((id) => {
            const def = BADGES.find((b) => b.id === id);
            return def ? `<span class="badge-chip">🏅 ${def.label}</span>` : '';
          }).join('')}
        </div>
      ` : ''}

      <div class="btn-row">
        <button class="btn-primary" id="play-again">Play Again</button>
        <button class="btn-secondary" id="go-zoo">Visit Zoo 🦎</button>
      </div>
    `;

    this.root.getElementById('play-again')?.addEventListener('click', () => this.navigate('/'));
    this.root.getElementById('go-zoo')?.addEventListener('click', () => this.navigate('/zoo'));
  }
}

customElements.define('results-screen', ResultsScreen);
