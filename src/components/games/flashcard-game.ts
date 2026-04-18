import { BaseComponent } from '../base-component.js';
import { wordsStore, progressStore } from '../../services/store.js';
import { selectSessionWords, normalizeAnswer } from '../../services/session.js';
import type { SessionWord, SessionResult } from '../../models/types.js';

export class FlashcardGame extends BaseComponent {
  private session: SessionWord[] = [];
  private current = 0;
  private results: SessionResult[] = [];
  private startTime = 0;
  private showingAnswer = false;

  connectedCallback(): void {
    const words = wordsStore.value;
    const progress = progressStore.value;
    this.session = selectSessionWords(words, progress);
    this.current = 0;
    this.results = [];
    this.renderCard();
  }

  private renderCard(): void {
    if (this.current >= this.session.length) {
      this.emit('session-complete', { results: this.results });
      return;
    }

    const sw = this.session[this.current];
    const prompt = sw.direction === 'hu-to-en' ? sw.word.hungarian : sw.word.english;
    const isHuToEn = sw.direction === 'hu-to-en';
    this.startTime = Date.now();
    this.showingAnswer = false;

    this.root.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--color-surface);
          font-family: var(--font-body);
        }

        .progress-bar-wrap {
          height: 6px;
          background: var(--color-surface-alt);
        }
        .progress-bar {
          height: 100%;
          background: var(--color-primary-light);
          transition: width 0.3s ease;
          width: ${((this.current / this.session.length) * 100).toFixed(1)}%;
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
          background: none;
          border: none;
          font-family: var(--font-body);
          font-size: 0.85rem;
          color: var(--color-text-muted);
          cursor: pointer;
        }
        .quit-btn:hover { color: var(--color-error); }

        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          gap: 24px;
        }

        .direction-label {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-muted);
        }

        .card {
          background: white;
          border-radius: var(--radius-card);
          box-shadow: var(--shadow-lift);
          padding: 40px 36px;
          text-align: center;
          width: 100%;
          max-width: 480px;
          animation: pop-in 0.25s ease both;
        }

        .prompt {
          font-size: 2rem;
          font-weight: 900;
          color: var(--color-primary-dark);
          margin-bottom: 8px;
        }

        .example {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          font-style: italic;
          margin-top: 8px;
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
          font-size: 1.1rem;
          font-weight: 600;
          outline: none;
          transition: border-color var(--transition-fast);
          background: white;
        }

        input:focus { border-color: var(--color-primary-light); }
        input.correct { border-color: var(--color-success); background: #f0fdf4; }
        input.wrong { border-color: var(--color-error); animation: shake 0.35s ease; }

        .submit-btn {
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: var(--radius-card);
          padding: 14px 20px;
          font-family: var(--font-body);
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .submit-btn:hover { background: var(--color-primary-dark); }

        .feedback {
          font-size: 1rem;
          font-weight: 700;
          padding: 12px 20px;
          border-radius: var(--radius-card);
          text-align: center;
          width: 100%;
          max-width: 480px;
        }
        .feedback.correct-fb { background: #d1fae5; color: #065f46; }
        .feedback.wrong-fb   { background: #fee2e2; color: #991b1b; }

        @keyframes pop-in {
          0%   { transform: scale(0.9); opacity: 0; }
          70%  { transform: scale(1.03); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
      </style>

      <div class="progress-bar-wrap"><div class="progress-bar"></div></div>

      <div class="header">
        <span>🃏 Flash Cards — ${this.current + 1} / ${this.session.length}</span>
        <button class="quit-btn">✕ Quit</button>
      </div>

      <main>
        <span class="direction-label">${isHuToEn ? 'Hungarian → English' : 'English → Hungarian'}</span>

        <div class="card">
          <div class="prompt">${prompt}</div>
          ${!isHuToEn && sw.word.exampleSentence ? `<div class="example">"${sw.word.exampleSentence}"</div>` : ''}
        </div>

        <div class="input-row">
          <input
            id="answer"
            type="text"
            placeholder="${isHuToEn ? 'Type the English word…' : 'Írd be magyarul…'}"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <button class="submit-btn">Check ✓</button>
        </div>

        <div class="feedback" style="display:none"></div>
      </main>
    `;

    const input = this.root.getElementById('answer') as HTMLInputElement;
    const submitBtn = this.root.querySelector('.submit-btn') as HTMLButtonElement;
    const feedback = this.root.querySelector('.feedback') as HTMLElement;

    const submit = () => {
      if (this.showingAnswer) {
        this.current++;
        this.renderCard();
        return;
      }
      this.checkAnswer(input, feedback, submitBtn, sw);
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    submitBtn.addEventListener('click', submit);
    this.root.querySelector('.quit-btn')?.addEventListener('click', () => {
      this.navigate('/');
    });

    input.focus();
  }

  private checkAnswer(
    input: HTMLInputElement,
    feedback: HTMLElement,
    btn: HTMLButtonElement,
    sw: SessionWord,
  ): void {
    const correct = sw.direction === 'hu-to-en' ? sw.word.english : sw.word.hungarian;
    const isCorrect = normalizeAnswer(input.value) === normalizeAnswer(correct);
    const elapsed = Date.now() - this.startTime;

    this.results.push({
      wordId: sw.word.id,
      direction: sw.direction,
      correct: isCorrect,
      responseTimeMs: elapsed,
    });

    this.showingAnswer = true;

    if (isCorrect) {
      input.classList.add('correct');
      feedback.className = 'feedback correct-fb';
      feedback.textContent = '✓ Correct! Well done!';
    } else {
      input.classList.add('wrong');
      feedback.className = 'feedback wrong-fb';
      feedback.textContent = `✗ The answer is: ${correct}`;
    }

    feedback.style.display = '';
    btn.textContent = 'Next →';

    setTimeout(() => {
      this.current++;
      this.renderCard();
    }, isCorrect ? 1000 : 2000);
  }
}

customElements.define('flashcard-game', FlashcardGame);
