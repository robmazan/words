import { render, html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { BaseComponent } from '../base-component.js';
import styles from './match-game.css?raw';
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
    const matched = this.cards.filter((c) => c.matched).length / 2;
    const total = this.cards.length / 2;

    render(html`
      <style>${styles}</style>

      <div class="progress-bar-wrap"><div class="progress-bar" style="width:${((matched / total) * 100).toFixed(1)}%"></div></div>

      <div class="header">
        <span>🧩 Match — Round ${this.round + 1}/${totalRounds}</span>
        <button class="quit-btn" @click=${() => this.navigate('/')}>✕ Quit</button>
      </div>

      <main>
        <p class="instructions">Match each English word with its Hungarian pair</p>

        <div class="grid" id="grid">
          ${this.cards.map((card) => html`
            <div
              class=${classMap({ 'card-wrap': true, flipped: card.flipped, matched: card.matched })}
              data-id="${card.id}"
              @click=${() => this.flipCard(card.id)}
            >
              <div class="card-inner">
                <div class="card-face card-back">🌿</div>
                <div class="card-face card-front ${card.side}">${card.text}</div>
              </div>
            </div>
          `)}
        </div>
      </main>
    `, this.root);
  }

  private flipCard(id: string): void {
    if (this.lockBoard) return;
    const card = this.cards.find((c) => c.id === id);
    if (!card || card.matched || card.flipped || this.flippedCards.length >= 2) return;

    card.flipped = true;
    this.flippedCards.push(id);
    this.renderBoard();

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

        this.totalResults.push({
          wordId: c1.wordId,
          direction: 'hu-to-en',
          correct: true,
          responseTimeMs: 0,
        });

        this.flippedCards = [];
        this.lockBoard = false;
        this.renderBoard();

        if (this.cards.every((c) => c.matched)) {
          setTimeout(() => {
            this.round++;
            this.startRound();
          }, 600);
        }
      } else {
        c1.flipped = false;
        c2.flipped = false;
        this.flippedCards = [];
        this.lockBoard = false;
        this.renderBoard();
      }
    }, 900);
  }
}

customElements.define('match-game', MatchGame);
