import { BaseComponent } from '../base-component.js';
import styles from './spelling-game.css?raw';
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
      <style>${styles}</style>

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

    const bar = this.root.querySelector('.progress-bar') as HTMLElement | null;
    if (bar) bar.style.width = `${((this.current / this.session.length) * 100).toFixed(1)}%`;

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
