/* RUNE LINK - GAME ENGINE (SMART AI VERSION) */

// ==========================================
// 1. STATE & DOM ELEMENTS
// ==========================================
const state = {
    selectedTerm: null, selectedDef: null,
    matches: 0, totalPairs: 0, health: 100, isLocked: true,
    comboCount: 0, 
    timerInterval: null, startTime: 0 
};

const dom = {
    colTerms: document.getElementById('col-terms'),
    colDefs: document.getElementById('col-defs'),
    svgLayer: document.getElementById('svg-layer'),
    healthFill: document.getElementById('health-fill'),
    score: document.getElementById('score'),
    timer: document.getElementById('game-timer'),
    modalWin: document.getElementById('victory-modal'),
    modalFail: document.getElementById('fail-modal'),
    // 🔥 New: Error Modal for Songs/Trash
    modalError: document.getElementById('error-modal') 
};

// ==========================================
// 2. INITIALIZATION (THE BRAIN 🧠)
// ==========================================
function initGame() {
    console.log(">> SYSTEM INIT...");
    let gameData = null;
    
    // 1. Load Data from Backend Response
    const storedData = localStorage.getItem("currentRuneLevel");
    
    if (storedData) {
        try { gameData = JSON.parse(storedData); } catch (e) { console.error("Corrupt Data"); }
    } 
    
    // 🔥 SMART CHECK 1: Agar Data hi nahi hai
    if (!gameData) {
        handleSystemError("NO DATA STREAM FOUND", "Please generate a dungeon first.");
        return;
    }

    // 🔥 SMART CHECK 2: Agar AI ne kaha "Ye Song hai / Not Educational"
    // (Backend se agar { "error": "Not educational" } aaya ho)
    if (gameData.error || !gameData.pairs || gameData.pairs.length === 0) {
        handleSystemError("SIGNAL NOISE DETECTED", "This video appears to be Entertainment/Music. No educational runes found.");
        return;
    }

    // Agar sab sahi hai, to Game start karo
    console.log(">> DATA VERIFIED. STARTING SIMULATION.");

    // 🔥 Apply Theme based on Topic
    applyTheme(gameData.title);

    // Update Titles
    const subTitle = document.querySelector('.sub-title');
    if(subTitle) subTitle.innerText = gameData.title ? gameData.title.toUpperCase() : "SYSTEM LINK";

    // Setup Logic
    state.totalPairs = gameData.pairs.length;
    const terms = gameData.pairs.map(p => ({ id: p.id, text: p.term, type: 'term' }));
    const defs = gameData.pairs.map(p => ({ id: p.id, text: p.def, type: 'def' }));

    shuffle(defs);
    renderColumn(dom.colTerms, terms);
    renderColumn(dom.colDefs, defs);
}

// 🔥 NEW: Error Handler for Songs/Bad Videos
function handleSystemError(title, msg) {
    if(!dom.modalError) return alert(msg); // Fallback

    const errTitle = dom.modalError.querySelector('h2');
    const errMsg = dom.modalError.querySelector('p');
    
    if(errTitle) errTitle.innerText = title;
    if(errMsg) errMsg.innerText = msg;

    dom.modalError.classList.remove('hidden');
    
    // 3 Second baad wapas bhej do
    /* setTimeout(() => {
        window.history.back();
    }, 4000); */
}

// ==========================================
// 3. RENDER FUNCTIONS
// ==========================================
function renderColumn(container, items) {
    if(!container) return;
    container.innerHTML = ''; 
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = item.id;
        card.dataset.type = item.type;
        card.innerHTML = `<span>${item.text}</span>`; 
        card.addEventListener('click', (e) => handleCardClick(card, e)); 
        card.addEventListener('mousemove', (e) => handleTilt(e, card));
        card.addEventListener('mouseleave', () => resetTilt(card));
        container.appendChild(card);
    });
}

// ==========================================
// 4. GAME LOGIC
// ==========================================
function handleCardClick(card, e) {
    if (state.isLocked || card.classList.contains('matched')) return;

    const type = card.dataset.type;

    if (type === 'term') {
        if (state.selectedTerm) state.selectedTerm.classList.remove('selected');
        state.selectedTerm = card;
        card.classList.add('selected');
    } else {
        if (state.selectedDef) state.selectedDef.classList.remove('selected');
        state.selectedDef = card;
        card.classList.add('selected');
    }

    if (state.selectedTerm && state.selectedDef) {
        const rect = card.getBoundingClientRect();
        checkMatch(rect.left + rect.width/2, rect.top + rect.height/2);
    }
}

function checkMatch(x, y) {
    state.isLocked = true;
    const termId = state.selectedTerm.dataset.id;
    const defId = state.selectedDef.dataset.id;

    if (termId === defId) {
        onMatchSuccess(x, y);
    } else {
        onMatchFail();
    }
}

function onMatchSuccess(x, y) {
    drawConnector(state.selectedTerm, state.selectedDef, true);
    
    state.selectedTerm.classList.add('matched');
    state.selectedDef.classList.add('matched');
    state.selectedTerm.classList.remove('selected');
    state.selectedDef.classList.remove('selected');

    state.matches++;
    state.comboCount++;
    state.selectedTerm = null; state.selectedDef = null; state.isLocked = false;
    
    const percent = Math.round((state.matches / state.totalPairs) * 100);
    if(dom.score) dom.score.innerText = percent;

    createParticles(x, y);
    if(state.comboCount > 1) showCombo(x, y, state.comboCount);

    if (state.matches === state.totalPairs) {
        clearInterval(state.timerInterval);
        setTimeout(() => { if(dom.modalWin) dom.modalWin.classList.remove('hidden'); }, 1000);
    }
}

function onMatchFail() {
    state.selectedTerm.classList.add('shake');
    state.selectedDef.classList.add('shake');
    state.comboCount = 0; 
    
    const line = drawConnector(state.selectedTerm, state.selectedDef, false);
    damageHealth(15); // Health Damage

    setTimeout(() => {
        if(state.selectedTerm) state.selectedTerm.classList.remove('shake', 'selected');
        if(state.selectedDef) state.selectedDef.classList.remove('shake', 'selected');
        state.selectedTerm = null; state.selectedDef = null; state.isLocked = false;
        if(line) line.remove(); 
    }, 500);
}

// ==========================================
// 5. VISUAL FX
// ==========================================
function createParticles(x, y) {
    const particleCount = 20;
    const colors = ['var(--primary)', 'var(--accent)', '#fff'];
    
    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        document.body.appendChild(p);
        
        const tx = (Math.random() - 0.5) * 200;
        const ty = (Math.random() - 0.5) * 200;
        
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.setProperty('--tx', `${tx}px`);
        p.style.setProperty('--ty', `${ty}px`);
        
        setTimeout(() => p.remove(), 1000);
    }
}

function showCombo(x, y, count) {
    const el = document.createElement('div');
    el.classList.add('combo-popup');
    el.innerText = `COMBO x${count}!`;
    el.style.left = `${x}px`;
    el.style.top = `${y - 50}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

function startTimerLogic() {
    state.startTime = Date.now();
    state.timerInterval = setInterval(() => {
        const delta = Math.floor((Date.now() - state.startTime) / 1000);
        const mins = Math.floor(delta / 60).toString().padStart(2, '0');
        const secs = (delta % 60).toString().padStart(2, '0');
        if(dom.timer) dom.timer.innerText = `${mins}:${secs}`;
    }, 1000);
}

// ==========================================
// 6. SVG LINES & UTILS
// ==========================================
function drawConnector(el1, el2, isSuccess) {
    const rect1 = el1.getBoundingClientRect();
    const rect2 = el2.getBoundingClientRect();
    const x1 = rect1.right - 10; const y1 = rect1.top + (rect1.height / 2);
    const x2 = rect2.left + 10; const y2 = rect2.top + (rect2.height / 2);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const curveOffset = 50;
    const d = `M ${x1} ${y1} C ${x1 + curveOffset} ${y1}, ${x2 - curveOffset} ${y2}, ${x2} ${y2}`;
    line.setAttribute('d', d);
    line.setAttribute('class', 'connector-line');
    
    if (!isSuccess) {
        line.style.stroke = 'var(--danger)';
        line.style.filter = 'drop-shadow(0 0 5px var(--danger))';
    }
    if(dom.svgLayer) dom.svgLayer.appendChild(line);
    return line;
}

function damageHealth(amount) {
    state.health -= amount;
    if (state.health < 0) state.health = 0;
    if(dom.healthFill) dom.healthFill.style.width = `${state.health}%`;
    if (state.health === 0) setTimeout(() => { if(dom.modalFail) dom.modalFail.classList.remove('hidden'); }, 500);
}

function handleTilt(e, card) {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10; 
    const rotateY = ((x - centerX) / centerX) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
}
function resetTilt(card) { card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale(1)`; }
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// ==========================================
// 7. NAVIGATION
// ==========================================
window.abortMission = function() {
    window.history.back();
};

// ==========================================
// 8. DYNAMIC THEME MANAGER
// ==========================================
function applyTheme(title) {
    const body = document.body;
    const video = document.getElementById('bg-video');
    if(!title || !video) return;

    const source = video.querySelector('source');
    const t = title.toLowerCase();

    body.removeAttribute('data-theme');
    let videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-lines-2767-large.mp4";

    // Coding Theme
    if (t.includes("code") || t.includes("python") || t.includes("java") || t.includes("html") || t.includes("web")) {
        body.setAttribute('data-theme', 'coding');
        videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-matrix-style-binary-code-rain-12502-large.mp4";
    }
    // Physics/Science Theme
    else if (t.includes("physics") || t.includes("space") || t.includes("thermo") || t.includes("science")) {
        body.setAttribute('data-theme', 'physics');
        videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4";
    }

    if(source && source.src !== videoUrl) {
        source.src = videoUrl;
        video.load();
        video.play();
    }
}

// ==========================================
// 9. SHEEP INTRO LOGIC (VR START) 🐑
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const gameUI = document.querySelector('.game-interface');
    if(gameUI) gameUI.classList.add('blur-mode');
});

window.startGameSequence = function() {
    const overlay = document.getElementById('intro-overlay');
    const gameUI = document.querySelector('.game-interface');
    
    // Fade out overlay
    overlay.style.transition = "opacity 0.5s ease";
    overlay.style.opacity = "0";
    
    // Wait then start
    setTimeout(() => {
        overlay.style.display = 'none';
        gameUI.classList.remove('blur-mode'); 
        
        // 🔥 Start Game
        initGame(); 
        startTimerLogic(); 
        state.isLocked = false; 
    }, 500);
};