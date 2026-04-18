import { BaseComponent } from '../base-component.js';
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

    this.root.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--color-surface);
          font-family: var(--font-body);
          user-select: none;
        }

        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
        }

        .timer {
          font-size: 1.6rem;
          font-weight: 900;
          color: var(--color-primary-dark);
          min-width: 40px;
          text-align: center;
          transition: color var(--transition-fast);
        }

        .streak {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 800;
          font-size: 1rem;
          color: var(--color-accent);
        }

        .score {
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
          padding: 24px;
          gap: 20px;
        }

        .direction-label {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-muted);
        }

        .prompt {
          font-size: 2.2rem;
          font-weight: 900;
          color: var(--color-primary-dark);
          text-align: center;
          animation: pop-in 0.2s ease both;
        }

        .input-row {
          display: flex;
          gap: 8px;
          width: 100%;
          max-width: 480px;
        }

        input {
          flex: 1;
          border: 2px solid var(--color-surface-alt);
          border-radius: var(--radius-card);
          padding: 14px 16px;
          font-family: var(--font-body);
          font-size: 1.2rem;
          font-weight: 600;
          outline: none;
          transition: border-color var(--transition-fast);
          background: white;
        }
        input:focus { border-color: var(--color-primary-light); }
        input.correct { border-color: var(--color-success); background: #f0fdf4; }
        input.wrong   { border-color: var(--color-error); animation: shake 0.3s ease; }

        .skip-btn {
          background: var(--color-surface-alt);
          border: none;
          border-radius: var(--radius-card);
          padding: 14px 16px;
          font-family: var(--font-body);
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text-muted);
          cursor: pointer;
        }
        .skip-btn:hover { background: #e8e0cc; }

        .feedback-toast {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 24px;
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-size: 1rem;
          animation: pop-in 0.2s ease both;
          pointer-events: none;
          white-space: nowrap;
        }
        .feedback-toast.correct { background: #d1fae5; color: #065f46; }
        .feedback-toast.wrong   { background: #fee2e2; color: #991b1b; }

        @keyframes pop-in {
          0%  { transform: translateX(-50%) scale(0.8); opacity: 0; }
          70% { transform: translateX(-50%) scale(1.05); }
          100%{ transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
      </style>

      <div class="top-bar">
        <span class="timer" id="timer" style="color:${this.timeLeft <= 10 ? 'var(--color-error)' : 'var(--color-primary-dark)'}">${this.timeLeft}</span>
        <span class="streak">🔥 ×${this.streak}</span>
        <span class="score">${this.results.filter((r) => r.correct).length} correct</span>
        <button class="quit-btn">✕ Quit</button>
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
          />
          <button class="skip-btn">Skip</button>
        </div>
      </main>
    `;

    const input = this.root.getElementById('answer') as HTMLInputElement;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submit(input, sw);
    });
    this.root.querySelector('.skip-btn')?.addEventListener('click', () => this.skip(sw));
    this.root.querySelector('.quit-btn')?.addEventListener('click', () => {
      this.clearTimer();
      this.navigate('/');
    });
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
