import { BaseComponent } from '../base-component.js';
import { wordsStore, progressStore } from '../../services/store.js';
import { selectSessionWords } from '../../services/session.js';
import { speech } from '../../services/speech.js';
import type { SessionWord, SessionResult } from '../../models/types.js';

export class SpellingGame extends BaseComponent {
  private session: SessionWord[] = [];
  private current = 0;
  private results: SessionResult[] = [];
  private startTime = 0;
  private showingAnswer = false;

  connectedCallback(): void {
    // Spelling bee: always English spelling — force en-to-hu direction isn't relevant;
    // we always show/speak English and ask the user to spell it
    const words = wordsStore.value;
    const progress = progressStore.value;
    // For spelling we always do en-to-hu direction (hear English, type English spelling)
    const session = selectSessionWords(words, progress);
    this.session = session.map((sw) => ({ ...sw, direction: 'hu-to-en' as const }));
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
    this.startTime = Date.now();
    this.showingAnswer = false;

    const hasVoice = speech.isAvailable();

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
          background: var(--color-accent);
          width: ${((this.current / this.session.length) * 100).toFixed(1)}%;
          transition: width 0.3s ease;
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
          gap: 20px;
        }

        .hint {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-align: center;
        }

        .hungarian-hint {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-primary-dark);
          background: white;
          border-radius: var(--radius-card);
          padding: 10px 20px;
          box-shadow: var(--shadow-card);
        }

        .speak-row {
          display: flex;
          gap: 12px;
        }

        .speak-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-accent);
          color: white;
          border: none;
          border-radius: var(--radius-pill);
          padding: 14px 24px;
          font-family: var(--font-body);
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: background var(--transition-fast), transform var(--transition-fast);
        }
        .speak-btn:hover { background: var(--color-accent-light); transform: scale(1.04); }
        .speak-btn:disabled { opacity: 0.5; cursor: default; transform: none; }

        .letter-reveal {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: center;
          min-height: 48px;
        }

        .letter {
          width: 40px;
          height: 48px;
          background: white;
          border: 2px solid var(--color-surface-alt);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          font-weight: 900;
          color: var(--color-primary-dark);
          animation: pop-in 0.2s ease both;
          animation-delay: calc(var(--i) * 0.05s);
          box-shadow: var(--shadow-card);
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
          letter-spacing: 0.08em;
        }
        input:focus { border-color: var(--color-accent); }
        input.correct { border-color: var(--color-success); background: #f0fdf4; }
        input.wrong   { border-color: var(--color-error); animation: shake 0.35s ease; }

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
        .correct-fb { background: #d1fae5; color: #065f46; }
        .wrong-fb   { background: #fee2e2; color: #991b1b; }

        @keyframes pop-in {
          0%  { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100%{ transform: scale(1); opacity: 1; }
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
        <span>🔊 Spelling Bee — ${this.current + 1} / ${this.session.length}</span>
        <button class="quit-btn">✕ Quit</button>
      </div>

      <main>
        <div class="hint">Listen and spell the English word</div>

        <div class="hungarian-hint">🇭🇺 ${sw.word.hungarian}</div>

        <div class="speak-row">
          <button class="speak-btn" id="speak-btn" ${!hasVoice ? 'disabled' : ''}>
            🔊 Hear the word
          </button>
        </div>

        ${!hasVoice ? `
          <div class="letter-reveal" id="letter-reveal">
            ${sw.word.english.split('').map((ch, i) =>
              `<span class="letter" style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`
            ).join('')}
          </div>
        ` : ''}

        <div class="input-row">
          <input
            id="answer"
            type="text"
            placeholder="Spell the word…"
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
    const speakBtn = this.root.getElementById('speak-btn') as HTMLButtonElement;
    const submitBtn = this.root.querySelector('.submit-btn') as HTMLButtonElement;
    const feedback = this.root.querySelector('.feedback') as HTMLElement;

    speakBtn?.addEventListener('click', () => speech.speak(sw.word.english));

    if (hasVoice) {
      // Auto-speak on load
      setTimeout(() => speech.speak(sw.word.english), 300);
    }

    const submit = () => {
      if (this.showingAnswer) {
        this.current++;
        this.renderCard();
        return;
      }
      this.checkAnswer(input, feedback, submitBtn, sw);
    };

    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    submitBtn.addEventListener('click', submit);
    this.root.querySelector('.quit-btn')?.addEventListener('click', () => this.navigate('/'));
    input.focus();
  }

  private checkAnswer(
    input: HTMLInputElement,
    feedback: HTMLElement,
    btn: HTMLButtonElement,
    sw: SessionWord,
  ): void {
    const isCorrect = input.value.trim().toLowerCase() === sw.word.english.toLowerCase();
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
      feedback.textContent = '✓ Perfect spelling!';
    } else {
      input.classList.add('wrong');
      feedback.className = 'feedback wrong-fb';
      feedback.innerHTML = `✗ It's spelled: <strong>${sw.word.english}</strong>`;
    }

    feedback.style.display = '';
    btn.textContent = 'Next →';

    setTimeout(() => {
      this.current++;
      this.renderCard();
    }, isCorrect ? 1000 : 2200);
  }
}

customElements.define('spelling-game', SpellingGame);
