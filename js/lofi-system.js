/**
 * MANA ZONE SYSTEM (Focus & Lofi Atmosphere)
 * Handles: Audio Player, Focus Timer, Theme Switching
 */

// --- CONFIGURATION ---
const soundscapes = {
    'lofi': 'jfKfPfyJRdk',   // Lofi Girl Live
    'rain': 'mPZkdNFkNps',   // Heavy Rain (Black Screen)
    'forest': 'xNN7iTA57jM', // Forest Nature Sounds
    'focus': 'WPni7r2Ei3k',  // Deep Focus Alpha Waves
    'epic': 'S-Xm7s9eGxU'    // Epic Orchestral
};

// --- STATE VARIABLES ---
let lofiPlayer;
let focusTimerInterval;
let isManaActive = false;
let isMusicPlaying = false;
let currentSoundId = soundscapes['lofi'];

// --- 1. INITIALIZE PLAYER (Hidden) ---
function initLofiPlayer() {
    console.log(">> Initializing Mana Zone Audio...");
    lofiPlayer = new YT.Player('lofi-player', {
        height: '0', width: '0',
        videoId: currentSoundId, 
        playerVars: { 'autoplay': 0, 'controls': 0, 'loop': 1, 'playlist': currentSoundId }
    });
}

// --- YOUTUBE API HOOK ---
// Ye logic ensure karta hai ki main video player aur lofi player dono load hon
const originalOnYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady;
window.onYouTubeIframeAPIReady = function() {
    if(originalOnYouTubeIframeAPIReady) originalOnYouTubeIframeAPIReady(); // Main Player
    initLofiPlayer(); // Lofi Player
};

// --- 2. TOGGLE MANA ZONE (Main Function) ---
function toggleManaZone() {
    isManaActive = !isManaActive;
    const body = document.body;
    const ui = document.getElementById('mana-interface');
    const btn = document.getElementById('mana-btn');

    if (isManaActive) {
        // === ACTIVATE ===
        body.classList.add('mana-active');
        ui.classList.remove('hidden');
        if(btn) btn.innerHTML = '<i class="fas fa-times"></i> EXIT ZONE';
        
        startFocusTimer(25 * 60); // 25 Minutes Default
        
        // Auto-start music
        if(lofiPlayer && lofiPlayer.playVideo) {
            lofiPlayer.setVolume(30);
            lofiPlayer.playVideo();
            isMusicPlaying = true;
            updateMusicIcon();
        }

    } else {
        // === DEACTIVATE ===
        body.classList.remove('mana-active');
        ui.classList.add('hidden');
        if(btn) btn.innerHTML = '<i class="fas fa-headphones-alt"></i> MANA ZONE';
        
        clearInterval(focusTimerInterval);
        const timerEl = document.getElementById('focus-timer');
        if(timerEl) timerEl.innerText = "25:00";
        
        // Stop music
        if(lofiPlayer && lofiPlayer.pauseVideo) {
            lofiPlayer.pauseVideo();
            isMusicPlaying = false;
        }
    }
}

// --- 3. ATMOSPHERE CHANGER ---
function changeAtmosphere(type) {
    const newId = soundscapes[type];
    if (lofiPlayer && newId) {
        currentSoundId = newId;
        lofiPlayer.loadVideoById(newId);
        lofiPlayer.setVolume(30); 
        
        // Force Play
        isMusicPlaying = true;
        updateMusicIcon();
    }
}

// --- 4. MUSIC CONTROLS ---
function toggleLoFi() {
    if(!lofiPlayer) return;
    
    if(isMusicPlaying) {
        lofiPlayer.pauseVideo();
        isMusicPlaying = false;
    } else {
        lofiPlayer.playVideo();
        isMusicPlaying = true;
    }
    updateMusicIcon();
}

function adjustLoFiVolume(val) {
    if(lofiPlayer) lofiPlayer.setVolume(val);
}

function updateMusicIcon() {
    const icon = document.getElementById('music-icon');
    if(icon) {
        icon.className = isMusicPlaying ? "fas fa-pause" : "fas fa-play";
    }
}

// --- 5. FOCUS TIMER LOGIC ---
function startFocusTimer(duration) {
    let timer = duration, minutes, seconds;
    clearInterval(focusTimerInterval);
    
    const display = document.getElementById('focus-timer');
    if(!display) return;

    focusTimerInterval = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(focusTimerInterval);
            // End of Session
            if(window.audioSys) audioSys.play('success');
            alert("MANA ZONE COMPLETE! +10 INTELLECT");
            
            // Optional: Auto Exit or Break Mode
            toggleManaZone(); 
        }
    }, 1000);
}