import { render, html, nothing } from 'lit-html';
import { BaseComponent } from '../base-component.js';
import styles from './flashcard-game.css?raw';
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

    render(html`
      <style>${styles}</style>

      <div class="progress-bar-wrap"><div class="progress-bar"></div></div>

      <div class="header">
        <span>🃏 Flash Cards — ${this.current + 1} / ${this.session.length}</span>
        <button class="quit-btn" @click=${() => this.navigate('/')}>✕ Quit</button>
      </div>

      <main>
        <span class="direction-label">${isHuToEn ? 'Hungarian → English' : 'English → Hungarian'}</span>

        <div class="card">
          <div class="prompt">${prompt}</div>
          ${!isHuToEn && sw.word.exampleSentence ? html`<div class="example">"${sw.word.exampleSentence}"</div>` : nothing}
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
