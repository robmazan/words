import { BaseComponent } from './base-component.js';
import { wordsStore, progressStore } from '../services/store.js';
import { getAnimalForWord, getAnimalState } from '../services/session.js';
import styles from './zoo-view.css?raw';

export class ZooView extends BaseComponent {
  connectedCallback(): void {
    this.subscribe(wordsStore, () => this.render());
    this.subscribe(progressStore, () => this.render());
  }

  private render(): void {
    const words = wordsStore.value;
    const progress = progressStore.value;

    const befriended = words.filter((w) => getAnimalState(progress.get(w.id)) === 'befriended').length;
    const peeking = words.filter((w) => getAnimalState(progress.get(w.id)) === 'peeking').length;
    const locked = words.length - befriended - peeking;

    this.root.innerHTML = `
      <style>${styles}</style>

      <header>
        <button class="back-btn" id="back">←</button>
        <h1>🦎 Your Zoo</h1>
        <span class="summary">${befriended} / ${words.length} befriended</span>
      </header>

      <main>
        <div class="stats-row">
          <span class="stat-pill befriended">✅ ${befriended} Befriended</span>
          <span class="stat-pill peeking">👀 ${peeking} Peeking</span>
          <span class="stat-pill locked">🔒 ${locked} Locked</span>
        </div>

        <div class="grid">
          ${words.map((word) => {
            const prog = progress.get(word.id);
            const state = getAnimalState(prog);
            const animal = getAnimalForWord(word.index);
            const mastery = prog?.masteryLevel ?? 0;

            return `
              <div class="animal-card ${state}">
                ${state === 'befriended' ? '<span class="badge-befriended">⭐</span>' : ''}
                <img
                  class="animal-img"
                  src="/animals/${animal}.svg"
                  alt="${animal}"
                  loading="lazy"
                />
                <span class="word-label" title="${word.english}">
                  ${state === 'locked' ? '???' : word.english}
                </span>
                <span class="word-hu">${state === 'locked' ? '???' : word.hungarian}</span>
                <div class="mastery-stars">
                  ${[1,2,3,4].map((i) =>
                    `<span class="star ${i <= mastery ? 'filled' : ''}">★</span>`
                  ).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </main>
    `;

    this.root.getElementById('back')?.addEventListener('click', () => this.navigate('/'));
  }
}

customElements.define('zoo-view', ZooView);
