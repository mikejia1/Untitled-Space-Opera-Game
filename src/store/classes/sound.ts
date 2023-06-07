

export class Sound {
    audio: HTMLAudioElement | null;

    constructor(audio: (HTMLAudioElement | null)) {
        this.audio = audio;
    }

    play(): void {
        if (this.audio === null) return;
        if (this.isPlaying()) return;
        this.audio?.play();
    }

    isPlaying(): boolean {
        return false;
    }
}