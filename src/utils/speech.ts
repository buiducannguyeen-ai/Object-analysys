class SpeechService {
  private lastSpoken: string = "";
  private lastSpokenTime: number = 0;
  private isEnabled: boolean = true;

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public speak(text: string, force: boolean = false) {
    if (!this.isEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const now = Date.now();
    // Prevent repeating the same word within 5 seconds unless forced
    if (!force && text === this.lastSpoken && now - this.lastSpokenTime < 5000) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending utterances
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find((v) => v.lang.startsWith("vi") || v.lang.includes("VN"));
      if (viVoice) {
        utterance.voice = viVoice;
      }

      this.lastSpoken = text;
      this.lastSpokenTime = now;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    }
  }
}

export const speechService = new SpeechService();
