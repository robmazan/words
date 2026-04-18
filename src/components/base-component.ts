import type { Store } from '../services/store.js';

export abstract class BaseComponent extends HTMLElement {
  protected root: ShadowRoot;
  private unsubs: Array<() => void> = [];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  protected subscribe<T>(store: Store<T>, handler: (v: T) => void): void {
    handler(store.value);
    this.unsubs.push(store.subscribe(handler));
  }

  disconnectedCallback(): void {
    this.unsubs.forEach((fn) => fn());
    this.unsubs = [];
  }

  protected emit(event: string, detail?: unknown): void {
    this.dispatchEvent(
      new CustomEvent(event, { bubbles: true, composed: true, detail }),
    );
  }

  protected navigate(path: string): void {
    this.emit('navigate', { path });
  }
}
