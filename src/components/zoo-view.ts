import { BaseComponent } from './base-component.js';
import { wordsStore, progressStore } from '../services/store.js';
import { getAnimalForWord, getAnimalState } from '../services/session.js';

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
      <style>
        :host {
          display: block;
          min-height: 100vh;
          background: var(--color-surface);
          font-family: var(--font-body);
        }

        header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
        }

        .back-btn {
          background: none;
          border: none;
          font-size: 1.3rem;
          cursor: pointer;
          color: var(--color-primary);
          line-height: 1;
        }

        header h1 {
          font-size: 1.3rem;
          font-weight: 900;
          color: var(--color-primary-dark);
          flex: 1;
        }

        .summary {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text-muted);
        }

        main {
          max-width: 720px;
          margin: 0 auto;
          padding: 24px;
        }

        .stats-row {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .stat-pill {
          border-radius: var(--radius-pill);
          padding: 6px 14px;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .stat-pill.befriended { background: #d1fae5; color: #065f46; }
        .stat-pill.peeking    { background: #fef3c7; color: #92400e; }
        .stat-pill.locked     { background: #f3f4f6; color: #6b7280; }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 14px;
        }

        .animal-card {
          background: white;
          border-radius: var(--radius-card);
          box-shadow: var(--shadow-card);
          padding: 14px 10px;
          text-align: center;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          position: relative;
          overflow: hidden;
        }

        .animal-card.befriended {
          border: 2px solid var(--color-success);
          background: #f0fdf4;
        }

        .animal-card.befriended:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-lift);
        }

        .animal-card.peeking {
          border: 2px solid var(--color-accent-light);
        }

        .animal-card.locked {
          border: 2px solid var(--color-surface-alt);
          opacity: 0.7;
        }

        .animal-img {
          width: 64px;
          height: 64px;
          object-fit: contain;
          margin-bottom: 8px;
        }

        .animal-card.locked .animal-img {
          filter: grayscale(100%) brightness(0.6);
        }

        .animal-card.befriended .animal-img {
          animation: bounce 0.7s ease infinite alternate;
        }

        .word-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-text);
          display: block;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .animal-card.locked .word-label { color: var(--color-locked); }

        .word-hu {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          font-weight: 600;
        }

        .mastery-stars {
          display: flex;
          justify-content: center;
          gap: 2px;
          margin-top: 6px;
        }

        .star {
          font-size: 0.7rem;
          opacity: 0.25;
        }
        .star.filled { opacity: 1; }

        .badge-befriended {
          position: absolute;
          top: 6px;
          right: 6px;
          font-size: 0.8rem;
        }

        @keyframes bounce {
          from { transform: translateY(0) rotate(-3deg); }
          to   { transform: translateY(-6px) rotate(3deg); }
        }
      </style>

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
