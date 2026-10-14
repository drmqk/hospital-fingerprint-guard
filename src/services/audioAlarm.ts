/**
 * Web Audio API synthesizer for hospital clinical alarms, pager beeps, and fingerprint alerts.
 * Completely client-side and 100% reliable with zero external asset dependencies.
 */

class AudioAlarmEngine {
  private ctx: AudioContext | null = null;
  private isAlarmPlaying = false;
  private currentInterval: number | null = null;
  private gainNode: GainNode | null = null;
  private masterVolume = 0.8;

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(console.error);
    }
    return this.ctx;
  }

  public setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  /**
   * Play a brief one-shot tone (e.g. for testing or short reminder notification)
   */
  public playTone(
    type: 'hospital_pager' | 'code_urgent' | 'chime_alert' | 'radar_pulse' = 'hospital_pager',
    customVolume?: number
  ) {
    try {
      const ctx = this.getAudioContext();
      const vol = customVolume !== undefined ? customVolume : this.masterVolume;
      const now = ctx.currentTime;

      switch (type) {
        case 'hospital_pager': {
          // Classic medical duty pager double-burst: 880Hz / 1760Hz
          this.playBeep(ctx, 987.77, now, 0.12, vol);
          this.playBeep(ctx, 1318.51, now + 0.15, 0.15, vol);
          this.playBeep(ctx, 987.77, now + 0.35, 0.12, vol);
          this.playBeep(ctx, 1318.51, now + 0.50, 0.20, vol);
          break;
        }
        case 'code_urgent': {
          // Urgent medical monitor warning tone (alternating high pitch)
          this.playBeep(ctx, 1046.5, now, 0.08, vol);
          this.playBeep(ctx, 1318.5, now + 0.1, 0.08, vol);
          this.playBeep(ctx, 1046.5, now + 0.2, 0.08, vol);
          this.playBeep(ctx, 1318.5, now + 0.3, 0.08, vol);
          this.playBeep(ctx, 1567.98, now + 0.4, 0.18, vol);
          break;
        }
        case 'chime_alert': {
          // Soft hospital chime for upcoming shift / reminder
          this.playSineChime(ctx, 523.25, now, 0.4, vol * 0.8); // C5
          this.playSineChime(ctx, 659.25, now + 0.18, 0.45, vol * 0.8); // E5
          this.playSineChime(ctx, 783.99, now + 0.36, 0.6, vol * 0.8); // G5
          break;
        }
        case 'radar_pulse': {
          // Biometric fingerprint scanner verification ping
          this.playBeep(ctx, 880, now, 0.06, vol);
          this.playBeep(ctx, 1760, now + 0.09, 0.22, vol);
          break;
        }
      }
    } catch (e) {
      console.warn('Audio synthesis failed (possibly awaiting user gesture):', e);
    }
  }

  private playBeep(ctx: AudioContext, frequency: number, startTime: number, duration: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.01, vol), startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  private playSineChime(ctx: AudioContext, frequency: number, startTime: number, duration: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol * 0.7, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Start a persistent repeating alarm (until stopAlarm() is called)
   */
  public startPersistentAlarm(
    type: 'hospital_pager' | 'code_urgent' | 'chime_alert' | 'radar_pulse' = 'hospital_pager',
    customVolume?: number
  ) {
    this.stopAlarm();
    this.isAlarmPlaying = true;

    // Play first burst immediately
    this.playTone(type, customVolume);

    // Repeat every 2.4 seconds
    this.currentInterval = window.setInterval(() => {
      if (!this.isAlarmPlaying) return;
      this.playTone(type, customVolume);
    }, 2400);
  }

  /**
   * Stop any active persistent alarm
   */
  public stopAlarm() {
    this.isAlarmPlaying = false;
    if (this.currentInterval !== null) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }
  }

  public isPlaying(): boolean {
    return this.isAlarmPlaying;
  }
}

export const audioAlarm = new AudioAlarmEngine();
