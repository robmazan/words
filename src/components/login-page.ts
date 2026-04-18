import { BaseComponent } from './base-component.js';
import { getLoginUrl } from '../services/auth.js';
import styles from './login-page.css?raw';

export class LoginPage extends BaseComponent {
  connectedCallback(): void {
    this.root.innerHTML = `
      <style>${styles}</style>

      <div class="card">
        <img class="mascot" src="/animals/capybara.svg" alt="Capybara mascot" />
        <h1>Capybara Academy</h1>
        <p class="tagline">Learn English words — one animal at a time 🌿</p>
        <a class="login-btn" href="${getLoginUrl()}">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.5 2.75a9.25 9.25 0 100 18.5 9.25 9.25 0 000-18.5zM1.25 12C1.25 6.063 6.063 1.25 12 1.25S22.75 6.063 22.75 12 17.937 22.75 12 22.75 1.25 17.937 1.25 12z"/>
            <path d="M12 6.75a5.25 5.25 0 100 10.5A5.25 5.25 0 0012 6.75z"/>
          </svg>
          Sign in with Microsoft
        </a>
      </div>
    `;
  }
}

customElements.define('login-page', LoginPage);
