// Système audio simple utilisant HTMLAudioElement
class AudioSystem {
    constructor() {
        this.currentAudio = null;
        this.currentTrackId = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.musicVolume = 1; // 0..1
        this.effectsVolume = 1; // réservé pour effets
    }

    getMusicUrl(trackId) {
        try {
            if (window.ShopSystem && Array.isArray(window.ShopSystem.musics)) {
                const item = window.ShopSystem.musics.find(m => m.id === trackId);
                if (item && item.url) return item.url.replace(/\s+/g, '_');
            }
        } catch (e) {
            console.warn('getMusicUrl: erreur en lisant ShopSystem', e);
        }

        const files = {
            0: 'assets/musique/tetris_original_meloboom.mp3',
            1: 'assets/musique/tetris_cheerful_meloboom.mp3',
            2: 'assets/musique/tetris_theme1.mp3',
            3: 'assets/musique/tetris_theme2.mp3',
            4: 'assets/musique/tetris_t_e_t_r_i_s.mp3'
        };

        return files[trackId] || files[0];
    }

    createAudio(url) {
        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = this.musicVolume;
        audio.preload = 'auto';

        audio.addEventListener('canplay', () => console.log('audio: canplay -', url));
        audio.addEventListener('error', (e) => {
            const msg = (e && e.target && e.target.error && e.target.error.message) ? e.target.error.message : e;
            console.error('audio: error -', msg, url);
        });

        return audio;
    }

    async playMusic(trackId) {
        try {
            const url = this.getMusicUrl(trackId);
            console.log('AudioSystem.playMusic -> trackId:', trackId, ' url:', url);

            if (this.currentAudio) {
                try { this.currentAudio.pause(); } catch (e) {}
                this.currentAudio = null;
                this.currentTrackId = null;
                this.isPlaying = false;
                this.isPaused = false;
            }

            // Tentative HEAD pour débogage (ignore les erreurs en file://)
            try {
                const resp = await fetch(url, { method: 'HEAD' });
                if (!resp || !resp.ok) console.warn('AudioSystem.playMusic: HEAD non ok for', url);
            } catch (e) {
                // ignore
            }

            const audio = this.createAudio(url);
            const p = audio.play();
            if (p && typeof p.then === 'function') {
                p.then(() => {
                    this.currentAudio = audio;
                    this.currentTrackId = trackId;
                    this.isPlaying = true;
                    this.isPaused = false;
                    console.log('AudioSystem: Play réussi! trackId=', trackId);
                }).catch(err => {
                    console.error('AudioSystem: play() failed:', err);
                });
            } else {
                this.currentAudio = audio;
                this.currentTrackId = trackId;
                this.isPlaying = true;
                this.isPaused = false;
                console.log('AudioSystem: Play démarré (no promise)');
            }
        } catch (e) {
            console.error('AudioSystem.playMusic exception:', e);
        }
    }

    pauseMusic() {
        if (!this.currentAudio) return;
        try {
            this.currentAudio.pause();
            this.isPaused = true;
            this.isPlaying = false;
        } catch (e) { console.error(e); }
    }

    resumeMusic() {
        if (!this.currentAudio) return;
        try {
            const p = this.currentAudio.play();
            if (p && typeof p.then === 'function') {
                p.then(() => { this.isPaused = false; this.isPlaying = true; })
                 .catch(err => console.error('AudioSystem.resumeMusic play failed:', err));
            } else { this.isPaused = false; this.isPlaying = true; }
        } catch (e) { console.error(e); }
    }

    stopMusic() {
        if (!this.currentAudio) return;
        try {
            this.currentAudio.pause();
            try { this.currentAudio.currentTime = 0; } catch (e) {}
            this.currentAudio = null;
            this.currentTrackId = null;
            this.isPlaying = false;
            this.isPaused = false;
        } catch (e) { console.error(e); }
    }

    setMusicVolume(volumePercent) {
        const v = Math.max(0, Math.min(1, volumePercent/100));
        this.musicVolume = v;
        if (this.currentAudio) try { this.currentAudio.volume = v; } catch(e) {}
    }

    setEffectsVolume(volumePercent) {
        this.effectsVolume = Math.max(0, Math.min(1, volumePercent/100));
    }
}

const audioSystem = new AudioSystem();
window.audioSystem = audioSystem;
