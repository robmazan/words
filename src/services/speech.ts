class SpeechService {
  private voice: SpeechSynthesisVoice | null = null;
  private ready = false;

  async init(): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      this.pickVoice(voices);
    } else {
      await new Promise<void>((resolve) => {
        speechSynthesis.onvoiceschanged = () => {
          this.pickVoice(speechSynthesis.getVoices());
          resolve();
        };
      });
    }
    this.ready = true;
  }

  private pickVoice(voices: SpeechSynthesisVoice[]): void {
    this.voice =
      voices.find((v) => v.lang === 'en-GB' && v.localService) ??
      voices.find((v) => v.lang === 'en-US' && v.localService) ??
      voices.find((v) => v.lang.startsWith('en-') && v.localService) ??
      voices.find((v) => v.lang.startsWith('en-')) ??
      null;
  }

  speak(text: string): void {
    if (!this.ready || !this.voice) {
      this.fallbackSpell(text);
      return;
    }
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.voice = this.voice;
    utt.rate = 0.85;
    utt.pitch = 1.05;
    speechSynthesis.speak(utt);
  }

  private fallbackSpell(_text: string): void {
    // If no voice available the spelling-game component handles visual fallback
  }

  isAvailable(): boolean {
    return this.ready && this.voice !== null;
  }
}

export const speech = new SpeechService();
