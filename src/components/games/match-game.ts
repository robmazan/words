import { BaseComponent } from '../base-component.js';
import { wordsStore, progressStore } from '../../services/store.js';
import { selectSessionWords } from '../../services/session.js';
import type { SessionWord, SessionResult } from '../../models/types.js';

interface Card {
  id: string;
  wordId: string;
  text: string;
  side: 'en' | 'hu';
  matched: boolean;
  flipped: boolean;
}

const PAIRS_PER_ROUND = 6;

export class MatchGame extends BaseComponent {
  private allWords: SessionWord[] = [];
  private round = 0;
  private totalResults: SessionResult[] = [];
  private cards: Card[] = [];
  private flippedCards: string[] = [];
  private lockBoard = false;

  connectedCallback(): void {
    const words = wordsStore.value;
    const progress = progressStore.value;
    this.allWords = selectSessionWords(words, progress);
    this.round = 0;
    this.totalResults = [];
    this.startRound();
  }

  private startRound(): void {
    const start = this.round * PAIRS_PER_ROUND;
    const slice = this.allWords.slice(start, start + PAIRS_PER_ROUND);

    if (slice.length === 0) {
      this.emit('session-complete', { results: this.totalResults });
      return;
    }

    this.cards = this.shuffle([
      ...slice.map((sw) => ({
        id: `en-${sw.word.id}`,
        wordId: sw.word.id,
        text: sw.word.english,
        side: 'en' as const,
        matched: false,
        flipped: false,
      })),
      ...slice.map((sw) => ({
        id: `hu-${sw.word.id}`,
        wordId: sw.word.id,
        text: sw.word.hungarian,
        side: 'hu' as const,
        matched: false,
        flipped: false,
      })),
    ]);

    this.flippedCards = [];
    this.lockBoard = false;
    this.renderBoard();
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private renderBoard(): void {
    const totalRounds = Math.ceil(this.allWords.length / PAIRS_PER_ROUND);
    const progress = this.cards.filter((c) => c.matched).length / 2;
    const total = this.cards.length / 2;

    this.root.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--color-surface);
          font-family: var(--font-body);
        }

        .progress-bar-wrap { height: 6px; background: var(--color-surface-alt); }
        .progress-bar {
          height: 100%;
          background: var(--color-primary-light);
          transition: width 0.4s ease;
          width: ${((progress / total) * 100).toFixed(1)}%;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          font-weight: 700;
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }

        .quit-btn {
          background: none; border: none;
          font-family: var(--font-body); font-size: 0.85rem;
          color: var(--color-text-muted); cursor: pointer;
        }
        .quit-btn:hover { color: var(--color-error); }

        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px;
          gap: 16px;
        }

        .instructions {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text-muted);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          width: 100%;
          max-width: 560px;
        }

        .card-wrap {
          aspect-ratio: 3/4;
          perspective: 600px;
          cursor: pointer;
        }

        .card-inner {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.4s ease;
          border-radius: var(--radius-card);
        }

        .card-wrap.flipped .card-inner,
        .card-wrap.matched .card-inner {
          transform: rotateY(180deg);
        }

        .card-face {
          position: absolute;
          inset: 0;
          border-radius: var(--radius-card);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          text-align: center;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .card-back {
          background: var(--color-primary);
          box-shadow: var(--shadow-card);
          font-size: 1.6rem;
        }

        .card-front {
          background: white;
          box-shadow: var(--shadow-card);
          transform: rotateY(180deg);
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text);
          word-break: break-word;
          hyphens: auto;
        }

        .card-front.en { border-top: 3px solid var(--color-primary-light); }
        .card-front.hu { border-top: 3px solid var(--color-accent); }

        .card-wrap.matched .card-front {
          background: #d1fae5;
          border-color: var(--color-success);
        }
      </style>

      <div class="progress-bar-wrap"><div class="progress-bar"></div></div>

      <div class="header">
        <span>🧩 Match — Round ${this.round + 1}/${totalRounds}</span>
        <button class="quit-btn">✕ Quit</button>
      </div>

      <main>
        <p class="instructions">Match each English word with its Hungarian pair</p>

        <div class="grid" id="grid">
          ${this.cards.map((card) => `
            <div
              class="card-wrap${card.flipped ? ' flipped' : ''}${card.matched ? ' matched' : ''}"
              data-id="${card.id}"
            >
              <div class="card-inner">
                <div class="card-face card-back">🌿</div>
                <div class="card-face card-front ${card.side}">${card.text}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </main>
    `;

    this.root.querySelectorAll('.card-wrap').forEach((el) => {
      el.addEventListener('click', () => {
        if (this.lockBoard) return;
        const id = (el as HTMLElement).dataset.id!;
        this.flipCard(id);
      });
    });

    this.root.querySelector('.quit-btn')?.addEventListener('click', () => this.navigate('/'));
  }

  private flipCard(id: string): void {
    const card = this.cards.find((c) => c.id === id);
    if (!card || card.matched || card.flipped || this.flippedCards.length >= 2) return;

    card.flipped = true;
    this.flippedCards.push(id);

    const el = this.root.querySelector(`[data-id="${id}"]`) as HTMLElement;
    el.classList.add('flipped');

    if (this.flippedCards.length === 2) {
      this.lockBoard = true;
      this.checkMatch();
    }
  }

  private checkMatch(): void {
    const [id1, id2] = this.flippedCards;
    const c1 = this.cards.find((c) => c.id === id1)!;
    const c2 = this.cards.find((c) => c.id === id2)!;

    const isMatch = c1.wordId === c2.wordId && c1.side !== c2.side;

    setTimeout(() => {
      if (isMatch) {
        c1.matched = true;
        c2.matched = true;
        const el1 = this.root.querySelector(`[data-id="${id1}"]`);
        const el2 = this.root.querySelector(`[data-id="${id2}"]`);
        el1?.classList.add('matched');
        el2?.classList.add('matched');

        this.totalResults.push({
          wordId: c1.wordId,
          direction: 'hu-to-en',
          correct: true,
          responseTimeMs: 0,
        });

        if (this.cards.every((c) => c.matched)) {
          setTimeout(() => {
            this.round++;
            this.startRound();
          }, 600);
        }
      } else {
        c1.flipped = false;
        c2.flipped = false;
        const el1 = this.root.querySelector(`[data-id="${id1}"]`);
        const el2 = this.root.querySelector(`[data-id="${id2}"]`);
        el1?.classList.remove('flipped');
        el2?.classList.remove('flipped');
      }

      this.flippedCards = [];
      this.lockBoard = false;
    }, 900);
  }
}

customElements.define('match-game', MatchGame);
