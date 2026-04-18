import { render, html, nothing } from 'lit-html';
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
    const words = wordsStore.value;
    const progress = progressStore.value;
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

    render(html`
      <style>${styles}</style>

      <div class="progress-bar-wrap"><div class="progress-bar"></div></div>

      <div class="header">
        <span>🔊 Spelling Bee — ${this.current + 1} / ${this.session.length}</span>
        <button class="quit-btn" @click=${() => this.navigate('/')}>✕ Quit</button>
      </div>

      <main>
        <div class="hint">Listen and spell the English word</div>

        <div class="hungarian-hint">🇭🇺 ${sw.word.hungarian}</div>

        <div class="speak-row">
          <button class="speak-btn" id="speak-btn" ?disabled=${!hasVoice}
            @click=${() => speech.speak(sw.word.english)}>
            🔊 Hear the word
          </button>
        </div>

        ${!hasVoice ? html`
          <div class="letter-reveal" id="letter-reveal">
            ${sw.word.english.split('').map((ch, i) => html`
              <span class="letter" style="--i:${i}">${ch === ' ' ? html`&nbsp;` : ch}</span>
            `)}
          </div>
        ` : nothing}

        <div class="input-row">
          <input
            id="answer"
            type="text"
            placeholder="Spell the word…"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this.handleSubmit(sw); }}
          />
          <button class="submit-btn" @click=${() => this.handleSubmit(sw)}>Check ✓</button>
        </div>

        <div class="feedback" style="display:none"></div>
      </main>
    `, this.root);

    const bar = this.root.querySelector('.progress-bar') as HTMLElement | null;
    if (bar) bar.style.width = `${((this.current / this.session.length) * 100).toFixed(1)}%`;

    const input = this.root.getElementById('answer') as HTMLInputElement;
    input.value = '';
    input.classList.remove('correct', 'wrong');

    const btn = this.root.querySelector('.submit-btn') as HTMLButtonElement;
    btn.textContent = 'Check ✓';

    const feedback = this.root.querySelector('.feedback') as HTMLElement;
    feedback.style.display = 'none';
    feedback.className = 'feedback';

    input.focus();

    if (hasVoice) {
      setTimeout(() => speech.speak(sw.word.english), 300);
    }
  }

  private handleSubmit(sw: SessionWord): void {
    if (this.showingAnswer) {
      this.current++;
      this.renderCard();
      return;
    }
    const input = this.root.getElementById('answer') as HTMLInputElement;
    const feedback = this.root.querySelector('.feedback') as HTMLElement;
    const btn = this.root.querySelector('.submit-btn') as HTMLButtonElement;
    this.checkAnswer(input, feedback, btn, sw);
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
