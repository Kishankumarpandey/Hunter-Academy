// =================================================================
// 🎵 MANA INTERFACE: AUDIO & TIMER SYSTEM (SYNCED)
// =================================================================

// -----------------------------------------------------------------
// 1. CONFIGURATION & STATE
// -----------------------------------------------------------------
const BRAINWAVES = {
    'delta': '/assets/audio/delta.mp3',
    'theta': '/assets/audio/theta.mp3',
    'alpha': '/assets/audio/alpha.mp3',
    'beta': '/assets/audio/beta.mp3',
    'gamma': '/assets/audio/gamma.mp3',
    'classical': '/assets/audio/classical.mp3',
    'nature': '/assets/audio/nature.mp3'
};

const audioPlayer = document.getElementById('local-audio-player');
const timerDisplay = document.getElementById('focus-timer'); // Timer Element

let isMusicPlaying = false;
let timerInterval = null;
let timeLeft = 25 * 60; // 25 Minutes (Default)
let isTimerRunning = false;

// -----------------------------------------------------------------
// 2. AUDIO SYSTEM (LINKED TO TIMER)
// -----------------------------------------------------------------

// Toggle Play/Pause
window.toggleLoFi = function() {
    const icon = document.getElementById('music-icon');
    
    if (!audioPlayer || !icon) return;

    if (isMusicPlaying) {
        // ⏸️ PAUSE
        audioPlayer.pause();
        icon.className = "fas fa-play";
        icon.style.color = "";
        isMusicPlaying = false;
        
        // Auto-Pause Timer
        pauseTimer(); 
    } else {
        // ▶️ PLAY
        if (!audioPlayer.src || audioPlayer.src === window.location.href) {
            const selectBox = document.getElementById('atmosphere-select');
            const currentType = selectBox ? selectBox.value : 'alpha';
            setAudioSource(currentType);
        }
        audioPlayer.play().catch(e => console.error("Audio Play Error:", e));
        
        icon.className = "fas fa-pause";
        icon.style.color = "var(--neon-blue)";
        isMusicPlaying = true;

        // Auto-Start Timer
        startTimer();
    }
}

// Change Atmosphere
window.changeAtmosphere = function(type) {
    const wasPlaying = isMusicPlaying;
    setAudioSource(type);
    if (wasPlaying) {
        audioPlayer.play().catch(e => console.error("Error:", e));
    }
}

function setAudioSource(type) {
    if(BRAINWAVES[type]) {
        audioPlayer.src = BRAINWAVES[type];
    }
}

window.adjustLoFiVolume = function(val) {
    if(audioPlayer) audioPlayer.volume = val / 100;
}

// -----------------------------------------------------------------
// 3. POMODORO TIMER LOGIC (MANUAL & AUTO)
// -----------------------------------------------------------------

// Allow Manual Click on Timer Text
if(timerDisplay) {
    timerDisplay.addEventListener('click', () => {
        if(isTimerRunning) pauseTimer();
        else startTimer();
    });
}

function startTimer() {
    if (isTimerRunning) return; // Already running

    isTimerRunning = true;
    if(timerDisplay) timerDisplay.style.color = "var(--neon-gold)"; // Active Color

    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            // Time's Up!
            completeTimer();
        }
    }, 1000);
}

function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
    if(timerDisplay) timerDisplay.style.color = "var(--neon-purple)"; // Paused Color
}

function completeTimer() {
    pauseTimer();
    timeLeft = 25 * 60; // Reset
    updateTimerDisplay();
    
    // Play Notification Sound
    const alarm = new Audio('/assets/audio/beta.mp3'); // Using existing file as alarm
    alarm.volume = 0.5;
    alarm.play().catch(() => {});
    setTimeout(() => alarm.pause(), 3000); // Stop after 3 sec

    alert("🎉 MANA RECHARGED: SESSION COMPLETE!");
}

function updateTimerDisplay() {
    if(!timerDisplay) return;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// -----------------------------------------------------------------
// 4. UI TOGGLES
// -----------------------------------------------------------------
window.toggleManaZone = function() {
    const interfaceDiv = document.getElementById('mana-interface');
    const btn = document.getElementById('mana-btn');
    
    if (!interfaceDiv) return;

    if (interfaceDiv.classList.contains('hidden')) {
        interfaceDiv.classList.remove('hidden');
        interfaceDiv.style.display = 'block'; 
        if(btn) {
            btn.style.background = "var(--neon-purple)";
            btn.style.color = "black";
            btn.style.boxShadow = "0 0 15px var(--neon-purple)";
        }
    } else {
        interfaceDiv.classList.add('hidden');
        interfaceDiv.style.display = 'none';
        if(btn) {
            btn.style.background = "rgba(189, 0, 255, 0.1)";
            btn.style.color = "var(--neon-purple)";
            btn.style.boxShadow = "none";
        }
    }
}