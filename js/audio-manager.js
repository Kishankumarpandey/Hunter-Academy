// js/audio-manager.js
class AudioManager {
    constructor() {
        this.sounds = {
            hover: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
            click: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
            success: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
            fail: new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'),
            typing: new Audio('https://assets.mixkit.co/active_storage/sfx/2407/2407-preview.mp3'),
            bgm: new Audio('https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Taira_Komori/Action_Game_Loops/Taira_Komori_-_03_-_Spacy_Synth_Loop.mp3')
        };
        this.sounds.bgm.loop = true;
        this.sounds.bgm.volume = 0.3;
        this.sounds.typing.volume = 0.5;
    }

    play(name) {
        if(this.sounds[name]) {
            this.sounds[name].currentTime = 0;
            this.sounds[name].play().catch(() => {});
        }
    }
    startBGM() { this.sounds.bgm.play().catch(() => {}); }
}
const audioSys = new AudioManager();