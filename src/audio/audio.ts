import { Howl, Howler } from 'howler';
import sprite from '../../public/assets/audio.json';
type Music = 'Betting' | 'Racing' | 'Winners';
export class GameAudio {
  private effects: Howl | null = null;
  private tracks = new Map<Music, Howl>();
  private phaseMusic: Music = 'Betting';
  private active: { key: Music; howl: Howl; id: number } | null = null;
  private fadeTimer?: ReturnType<typeof setTimeout>;
  private paused = false;
  enabled = false;
  setPhase(phase: string) {
    const key: Music = ['race', 'finish', 'result', 'preview'].includes(phase)
      ? 'Racing'
      : phase === 'podium'
        ? 'Winners'
        : 'Betting';
    this.phaseMusic = key;
    if (this.enabled && !this.paused) this.startMusic();
  }
  private startMusic() {
    if (this.active?.key === this.phaseMusic) {
      if (!this.active.howl.playing(this.active.id)) this.active.howl.play(this.active.id);
      return;
    }
    clearTimeout(this.fadeTimer);
    const previous = this.active;
    // Prevent a third fading track from remaining audible after quick preview switches.
    for (const track of this.tracks.values()) if (track !== previous?.howl) track.stop();
    let track = this.tracks.get(this.phaseMusic);
    if (!track) {
      track = new Howl({
        src: [`${import.meta.env.BASE_URL}assets/music/${this.phaseMusic}.mp3`],
        loop: true,
        volume: 0,
        preload: false,
      });
      this.tracks.set(this.phaseMusic, track);
    }
    track.volume(0);
    const id = track.play();
    this.active = { key: this.phaseMusic, howl: track, id };
    track.once(
      'play',
      () => {
        if (this.active?.id === id && this.active.howl === track) track!.fade(0, 0.28, 600, id);
      },
      id,
    );
    if (previous) {
      previous.howl.fade(previous.howl.volume(previous.id) as number, 0, 500, previous.id);
      this.fadeTimer = setTimeout(() => previous.howl.stop(previous.id), 550);
    }
  }
  async unlock(): Promise<void> {
    if (!this.effects)
      this.effects = new Howl({
        src: [`${import.meta.env.BASE_URL}assets/audio.wav`],
        sprite: sprite as unknown as Record<string, [number, number] | [number, number, boolean]>,
        volume: 0.4,
      });
    if (Howler.ctx?.state === 'suspended') await Howler.ctx.resume();
    this.enabled = true;
    if (!this.paused) this.startMusic();
  }
  toggle() {
    if (this.enabled) {
      this.enabled = false;
      clearTimeout(this.fadeTimer);
      this.effects?.stop();
      for (const track of this.tracks.values()) track.stop();
      this.active = null;
    } else void this.unlock();
  }
  play(name: string) {
    if (this.enabled && !this.paused) this.effects?.play(name);
  }
  pause() {
    this.paused = true;
    this.effects?.pause();
    for (const track of this.tracks.values()) track.pause();
  }
  resume() {
    this.paused = false;
    if (this.enabled) this.startMusic();
  }
  destroy() {
    clearTimeout(this.fadeTimer);
    this.effects?.unload();
    for (const track of this.tracks.values()) track.unload();
    this.tracks.clear();
    this.active = null;
  }
}
