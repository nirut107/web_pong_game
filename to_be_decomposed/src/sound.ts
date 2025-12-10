export class Sound {
  private audio: HTMLAudioElement;

  constructor(src: string, volume = 1.0, loop = false) {
    this.audio = new Audio(src);
    this.audio.volume = volume;
    this.audio.loop = loop;
  }

  play() {
    this.audio.currentTime = 0; // Restart
    this.audio.play().catch((err) => console.warn("Sound play error:", err));
  }

  pause() {
    this.audio.pause();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  setVolume(volume: number) {
    this.audio.volume = volume;
  }

  setLoop(loop: boolean) {
    this.audio.loop = loop;
  }
}

export const SoundManager = {
  home: new Sound("/sounds/home.mp3", 0.5, true),
  map: new Sound("/sounds/map.mp3", 0.5, true),
  coderush: new Sound("/sounds/coderush.mp3", 0.5, true),
};
