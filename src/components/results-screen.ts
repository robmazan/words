import { render, html, nothing } from 'lit-html';
import { BaseComponent } from './base-component.js';
import styles from './results-screen.css?raw';
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
    if (this.results.length > 0) {
      this.processAndRender();
    } else {
      render(html`
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:var(--font-body);font-size:1.1rem;color:var(--color-text-muted)">
          Loading results…
        </div>
      `, this.root);
    }
  }

  private async processAndRender(): Promise<void> {
    if (this.saving) return;
    this.saving = true;

    const words = wordsStore.value;
    const oldProgress = progressStore.value;
    const oldProfile = profileStore.value;

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

    Promise.all([
      api.putProgress(this.results),
      api.putProfile(updatedProfile),
    ]).catch((err) => console.error('Save failed:', err));

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

    render(html`
      <style>${styles}</style>

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

      ${levelUp ? html`<div class="level-up">🎉 Level Up! You're now Level ${newLevel}!</div>` : nothing}

      <div class="xp-section">
        <div class="xp-label">
          <span>Level ${newLevel}</span>
          <span>${newXP} XP</span>
        </div>
        <div class="xp-bar-wrap"><div class="xp-bar"></div></div>
      </div>

      ${newlyBefriended.length > 0 ? html`
        <div class="animals-section">
          <h2>🐾 New animal friends!</h2>
          <div class="animals-row">
            ${newlyBefriended.map((w) => html`
              <div class="animal-chip">
                <img src="/animals/${getAnimalForWord(w.index)}.svg" alt="" />
                ${w.english}
              </div>
            `)}
          </div>
        </div>
      ` : nothing}

      ${newBadges.length > 0 ? html`
        <div class="badges-section">
          <h2>🏅 New badges!</h2>
          ${newBadges.map((id) => {
            const def = BADGES.find((b) => b.id === id);
            return def ? html`<span class="badge-chip">🏅 ${def.label}</span>` : nothing;
          })}
        </div>
      ` : nothing}

      <div class="btn-row">
        <button class="btn-primary" @click=${() => this.navigate('/')}>Play Again</button>
        <button class="btn-secondary" @click=${() => this.navigate('/zoo')}>Visit Zoo 🦎</button>
      </div>
    `, this.root);

    const xpBar = this.root.querySelector('.xp-bar') as HTMLElement | null;
    if (xpBar) {
      xpBar.style.setProperty('--xp-from', `${xpBarFrom.toFixed(1)}%`);
      xpBar.style.setProperty('--xp-to', `${xpBarTo.toFixed(1)}%`);
      xpBar.style.width = `${xpBarTo.toFixed(1)}%`;
    }
  }
}

customElements.define('results-screen', ResultsScreen);
