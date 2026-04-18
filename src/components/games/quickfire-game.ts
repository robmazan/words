import { render, html } from 'lit-html';
import { BaseComponent } from '../base-component.js';
import styles from './quickfire-game.css?raw';
import { wordsStore, progressStore } from '../../services/store.js';
import { selectSessionWords, normalizeAnswer } from '../../services/session.js';
import type { SessionWord, SessionResult } from '../../models/types.js';

const ROUND_SECONDS = 30;

export class QuickfireGame extends BaseComponent {
  private session: SessionWord[] = [];
  private current = 0;
  private results: SessionResult[] = [];
  private timeLeft = ROUND_SECONDS;
  private streak = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private showingFeedback = false;
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  connectedCallback(): void {
    const words = wordsStore.value;
    const progress = progressStore.value;
    this.session = selectSessionWords(words, progress);
    this.current = 0;
    this.results = [];
    this.streak = 0;
    this.timeLeft = ROUND_SECONDS;
    this.renderGame();
    this.startTimer();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.feedbackTimer !== null) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }

  private startTimer(): void {
    this.timerId = setInterval(() => {
      this.timeLeft--;
      const timerEl = this.root.getElementById('timer');
      if (timerEl) {
        timerEl.textContent = String(this.timeLeft);
        if (this.timeLeft <= 10) timerEl.style.color = 'var(--color-error)';
      }
      if (this.timeLeft <= 0) {
        this.clearTimer();
        this.finishSession();
      }
    }, 1000);
  }

  private renderGame(): void {
    if (this.current >= this.session.length) {
      this.clearTimer();
      this.finishSession();
      return;
    }

    const sw = this.session[this.current];
    const isHuToEn = sw.direction === 'hu-to-en';
    const prompt = isHuToEn ? sw.word.hungarian : sw.word.english;
    this.startTime = Date.now();
    this.showingFeedback = false;

    render(html`
      <style>${styles}</style>

      <div class="top-bar">
        <span class="timer" id="timer"
          style="color:${this.timeLeft <= 10 ? 'var(--color-error)' : 'var(--color-primary-dark)'}">
          ${this.timeLeft}
        </span>
        <span class="streak">🔥 ×${this.streak}</span>
        <span class="score">${this.results.filter((r) => r.correct).length} correct</span>
        <button class="quit-btn" @click=${() => { this.clearTimer(); this.navigate('/'); }}>✕ Quit</button>
      </div>

      <main>
        <span class="direction-label">${isHuToEn ? 'Hungarian → English' : 'English → Hungarian'}</span>
        <div class="prompt">${prompt}</div>

        <div class="input-row">
          <input
            id="answer"
            type="text"
            placeholder="Type the answer…"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this.submit(e.target as HTMLInputElement, sw); }}
          />
          <button class="skip-btn" @click=${() => this.skip(sw)}>Skip</button>
        </div>
      </main>
    `, this.root);

    const input = this.root.getElementById('answer') as HTMLInputElement;
    input.focus();
  }

  private submit(input: HTMLInputElement, sw: SessionWord): void {
    if (this.showingFeedback) return;
    const correct = sw.direction === 'hu-to-en' ? sw.word.english : sw.word.hungarian;
    const isCorrect = normalizeAnswer(input.value) === normalizeAnswer(correct);
    this.recordResult(sw, isCorrect);

    input.classList.add(isCorrect ? 'correct' : 'wrong');
    this.showToast(isCorrect ? `✓ ${correct}` : `✗ ${correct}`, isCorrect);

    this.showingFeedback = true;
    this.feedbackTimer = setTimeout(() => {
      this.current++;
      this.renderGame();
    }, isCorrect ? 500 : 900);
  }

  private skip(sw: SessionWord): void {
    if (this.showingFeedback) return;
    this.recordResult(sw, false);
    this.streak = 0;
    this.current++;
    this.renderGame();
  }

  private recordResult(sw: SessionWord, correct: boolean): void {
    this.results.push({
      wordId: sw.word.id,
      direction: sw.direction,
      correct,
      responseTimeMs: Date.now() - this.startTime,
    });
    if (correct) {
      this.streak++;
    } else {
      this.streak = 0;
    }
  }

  private showToast(text: string, correct: boolean): void {
    const existing = this.root.querySelector('.feedback-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `feedback-toast ${correct ? 'correct' : 'wrong'}`;
    toast.textContent = text;
    this.root.querySelector('main')?.appendChild(toast);
    setTimeout(() => toast.remove(), 800);
  }

  private finishSession(): void {
    this.emit('session-complete', { results: this.results });
  }
}

customElements.define('quickfire-game', QuickfireGame);
