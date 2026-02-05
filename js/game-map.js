// js/game-map.js

// 🛑 FIX 1: Import line hatayi hai taaki "SyntaxError" na aaye.
// Hum mankar chal rahe hain ki 'hunter-db.js' HTML me pehle load ho chuka hai.
const syncXPToCloud = window.syncXPToCloud || function(xp) { 
    console.log("⚠️ Cloud Sync Skipped (Function not loaded)"); 
};

// =============================================================
// 🔥 1. INITIALIZATION & LOAD
// =============================================================

let previousLevel = 0; 

window.onload = function() {
    updatePlayerStats(); 
    loadRecentDungeons(); 
    if(typeof initSpotlightEffect === 'function') initSpotlightEffect();
    // Inject Header Controls if Roadmap is already open
    if(document.getElementById('roadmap-overlay') && !document.getElementById('roadmap-overlay').classList.contains('hidden')) {
        injectHeaderControls();
    }

    const userStr = localStorage.getItem('user_info');
    if(userStr) {
        const user = JSON.parse(userStr);
        if(document.getElementById('player-name')) document.getElementById('player-name').innerText = user.displayName.toUpperCase();
        const avatar = document.querySelector('.avatar-img');
        if(avatar && user.photoURL) avatar.src = user.photoURL;
    }
};

// =============================================================
// 🔥 2. CORE STATS LOGIC
// =============================================================

function updatePlayerStats() {
    let totalXP = parseInt(localStorage.getItem('add_xp') || "0");
    let currentLevel = Math.floor(totalXP / 100) + 1;
    let currentBarXP = totalXP % 100;
    
    if (previousLevel !== 0 && currentLevel > previousLevel) {
        showLevelUp(previousLevel, currentLevel);
        if(window.audioSys && window.audioSys.play) window.audioSys.play('levelUp'); 
    }
    previousLevel = currentLevel; 

    const elLvl = document.getElementById('player-lvl');
    if(elLvl) elLvl.innerText = currentLevel;
    
    const elRank = document.getElementById('player-rank');
    if(elRank) elRank.innerText = getRankName(currentLevel);

    // Update Stats UI
    if(document.getElementById('stat-str')) document.getElementById('stat-str').innerText = 10 + (currentLevel * 2);
    if(document.getElementById('stat-int')) document.getElementById('stat-int').innerText = 10 + (currentLevel * 2);
    if(document.getElementById('stat-agi')) document.getElementById('stat-agi').innerText = 10 + (currentLevel * 1);
    
    if(document.getElementById('xp-text')) document.getElementById('xp-text').innerText = `${currentBarXP} / 100 XP`;
    if(document.getElementById('xp-bar')) document.getElementById('xp-bar').style.width = `${(currentBarXP / 100) * 100}%`;
}

function getRankName(level) {
    if (level >= 50) return "S-RANK";
    if (level >= 30) return "A-RANK";
    if (level >= 20) return "B-RANK";
    if (level >= 10) return "C-RANK";
    if (level >= 5) return "D-RANK";
    return "E-RANK";
}

// =============================================================
// 🔥 3. LEVEL UP HANDLERS
// =============================================================

function showLevelUp(oldLvl, newLvl) {
    const overlay = document.getElementById('levelup-overlay');
    if(!overlay) return;
    const oldEl = document.getElementById('lvl-old');
    const newEl = document.getElementById('lvl-new');
    if(oldEl) oldEl.innerText = oldLvl;
    if(newEl) newEl.innerText = newLvl;
    
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
}

window.closeLevelUp = function() {
    const overlay = document.getElementById('levelup-overlay');
    if(overlay) overlay.style.display = 'none';
}

// =============================================================
// 🔥 4. DUNGEON HISTORY SYSTEM
// =============================================================

async function enterGate() {
    const urlInput = document.getElementById('dashboard-url');
    const url = urlInput.value.trim();
    const btn = document.querySelector('.enter-btn');

    if (!url) return alert("⚠️ SYSTEM ERROR: KEYSTONE MISSING (Please paste a YouTube URL)");

    const originalText = btn.innerText;
    btn.innerText = "⏳ OPENING GATE...";
    btn.disabled = true;
    btn.style.opacity = "0.7";

    try {
        console.log("📡 Contacting Server...");
        const res = await fetch(`${API_BASE_URL}/generate-dungeon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: url })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Server rejected the key.");

        localStorage.setItem('dungeon_data', JSON.stringify(data));
        localStorage.setItem('mission_url', url); 

        saveHistory({
            url: url,
            title: (data.summary && data.summary[0]) ? data.summary[0] : "Unknown Dungeon",
            thumb: `https://img.youtube.com/vi/${getYouTubeID(url)}/mqdefault.jpg`,
            timestamp: Date.now()
        });

        btn.innerText = "GATE OPEN!";
        btn.style.background = "#00ff00"; 
        document.body.style.transition = "opacity 0.5s";
        document.body.style.opacity = "0";

        setTimeout(() => window.location.href = 'study-game.html?fresh=' + Date.now(), 800);

    } catch (error) {
        console.error("❌ Gate Error:", error);
        alert(`🚫 GATE BLOCKED: ${error.message}\n(Make sure server is running)`);
        btn.innerText = originalText;
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.background = "";
    }
}
window.enterGate = enterGate;

function getYouTubeID(url) {
    if(!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function saveHistory(newEntry) {
    let history = JSON.parse(localStorage.getItem('dungeon_history')) || [];
    history = history.filter(h => h.url !== newEntry.url);
    history.unshift(newEntry);
    if(history.length > 6) history.pop();
    localStorage.setItem('dungeon_history', JSON.stringify(history));
}

function loadRecentDungeons() {
    const grid = document.getElementById('recents-grid');
    if(!grid) return;

    const history = JSON.parse(localStorage.getItem('dungeon_history')) || [];
    
    if(history.length === 0) {
        grid.innerHTML = `<div class="empty-msg">NO RECENT DUNGEONS FOUND. START A NEW ONE!</div>`;
        return;
    }

    grid.innerHTML = history.map(item => `
        <div class="dungeon-card" onclick="startMission('${item.url}')">
            <button class="delete-card-btn" onclick="removeFromHistory(event, '${item.url}')"><i class="fas fa-trash"></i></button>
            <div class="card-img" style="background-image: url('${item.thumb}');">
                <div class="card-badge">OPEN</div>
            </div>
            <div class="card-title">${item.title}</div>
            <div class="card-meta"><span><i class="fas fa-play-circle"></i> RESUME</span></div>
            <div style="width:100%; height:4px; background:#333; border-radius:2px; margin-top:10px;">
                <div style="width:100%; height:100%; background:var(--neon-blue);"></div>
            </div>
        </div>
    `).join('');
}

window.startMission = function(videoUrl) {
    localStorage.setItem('mission_url', videoUrl);
    document.body.style.opacity = "0";
    setTimeout(() => window.location.href = 'study-game.html?fresh=' + Date.now(), 500);
}

window.removeFromHistory = function(e, url) { 
    e.stopPropagation(); 
    let history = JSON.parse(localStorage.getItem('dungeon_history')) || []; 
    history = history.filter(h => h.url !== url); 
    localStorage.setItem('dungeon_history', JSON.stringify(history)); 
    loadRecentDungeons(); 
}

function clearHistory() { if(confirm("DELETE DUNGEON LOGS?")) { localStorage.removeItem('dungeon_history'); loadRecentDungeons(); } }
window.clearHistory = clearHistory;

// =============================================================
// 🔥 5. QUEST LOGIC (FIXED SELECTORS & DATE LOCK) 🛡️
// =============================================================

let questTimerInterval; 

function checkDailyQuest() {
    const lastTrainingDate = localStorage.getItem('last_training_date');
    const todayDate = new Date().toDateString();

    if (lastTrainingDate === todayDate) {
        console.log("System: Daily Limit Reached.");
        showCooldownUI(); 
    } else {
        console.log("System: New Quest Available.");
        showQuestOverlay();
    }
}


window.forceDailyQuest = function() { 
    checkDailyQuest(); 
}

// --- CASE 1: QUEST BAAKI HAI ---
function showQuestOverlay() {
    const alertBox = document.getElementById('system-alert');
    if(!alertBox) return console.error("❌ 'system-alert' not found in HTML");

    // 🛑 FIX 2: Using '.alert-box' instead of '.modal-box' to match HTML
    const modalBox = alertBox.querySelector('.alert-box'); 
    
    if(!modalBox) return console.error("❌ '.alert-box' class not found inside system-alert");

    alertBox.classList.remove('hidden');
    alertBox.style.display = 'flex';
    
    // Inject Normal Quest Content
    modalBox.innerHTML = `
        <div class="alert-header"><i class="fas fa-exclamation-circle"></i> SYSTEM ALERT</div>
        <div class="alert-content">
            <h3 style="color:var(--neon-blue); margin:0 0 5px 0;">DAILY QUEST: PREPARATION</h3>
            <p style="color:#aaa; font-size:0.9rem; margin-bottom:15px;">Complete training to level up.</p>
            <div class="quest-list">
                <div class="quest-item" onclick="toggleTask(this)">
                    <input type="checkbox"><span>10 Push-ups (Strength +1)</span>
                </div>
                <div class="quest-item" onclick="toggleTask(this)">
                    <input type="checkbox"><span>Hold Breath 20s (Focus +1)</span>
                </div>
                <div class="quest-item" onclick="toggleTask(this)">
                    <input type="checkbox"><span>1 min Meditation (Mana +1)</span>
                </div>
            </div>
            <div class="alert-actions">
                <button id="claim-btn" class="action-q-btn btn-claim" onclick="completeDailyQuest()">INCOMPLETE</button>
                <button class="action-q-btn btn-skip" onclick="skipDailyQuest()">SKIP</button>
            </div>
        </div>
    `;

    if(window.audioSys && window.audioSys.play) window.audioSys.play('click');
}

// --- CASE 2: QUEST DONE (COOLDOWN) ---
function showCooldownUI() {
    const alertBox = document.getElementById('system-alert');
    if(!alertBox) return;

    // 🛑 FIX 2: Matched class name here too
    const modalBox = alertBox.querySelector('.alert-box');
    if(!modalBox) return;

    alertBox.classList.remove('hidden');
    alertBox.style.display = 'flex';

    // Inject Timer Content
    modalBox.innerHTML = `
        <div style="text-align:center; padding: 20px;">
            <i class="fas fa-lock" style="font-size:3rem; color:#ff3333; margin-bottom:15px; text-shadow: 0 0 15px red;"></i>
            <h2 style="color:#ff3333; font-family:'Orbitron'; margin:0;">SYSTEM LIMIT REACHED</h2>
            <p style="color:#aaa; margin-top:10px;">Recovery in progress. Next Quest:</p>
            
            <div id="quest-countdown" style="font-size: 2rem; color: #fff; font-family: monospace; background: #111; padding: 15px; border: 1px solid #333; border-radius: 8px; margin: 20px 0;">Calculating...</div>

            <button onclick="document.getElementById('system-alert').style.display='none'" style="background: transparent; border: 1px solid #555; color: #777; padding: 10px 30px; cursor: pointer; border-radius: 5px;">CLOSE</button>
        </div>
    `;

    startCountdown();
}

function startCountdown() {
    const timerDisplay = document.getElementById('quest-countdown');
    if(!timerDisplay) return;

    if (questTimerInterval) clearInterval(questTimerInterval);

    questTimerInterval = setInterval(() => {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0); 
        const diff = tomorrow - now;

        if (diff <= 0) {
            clearInterval(questTimerInterval);
            location.reload(); 
            return;
        }

        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        timerDisplay.innerText = `${h.toString().padStart(2, '0')}h : ${m.toString().padStart(2, '0')}m : ${s.toString().padStart(2, '0')}s`;
    }, 1000);
}

// --- UI HELPERS ---
window.toggleTask = function(element) {
    const checkbox = element.querySelector('input');
    checkbox.checked = !checkbox.checked;
    
    if (checkbox.checked) element.classList.add('completed'); 
    else element.classList.remove('completed');
    
    const totalChecked = document.querySelectorAll('.quest-item input:checked').length;
    const btn = document.getElementById('claim-btn');

    if(btn) {
        if(totalChecked >= 3) { 
            btn.innerText = "CLAIM REWARD"; 
            btn.classList.add('ready'); 
            if(window.audioSys && window.audioSys.play) window.audioSys.play('hover');
        } else { 
            btn.innerText = "INCOMPLETE"; 
            btn.classList.remove('ready'); 
        }
    }
}

window.completeDailyQuest = function() {
    const btn = document.getElementById('claim-btn');
    if (!btn || !btn.classList.contains('ready')) return;
    
    const rewardXP = 50; 
    localStorage.setItem('add_xp', parseInt(localStorage.getItem('add_xp') || "0") + rewardXP);
    
    // 🔥 SAVE DATE
    const todayDate = new Date().toDateString();
    localStorage.setItem('last_training_date', todayDate);
    
    if(window.audioSys && window.audioSys.play) window.audioSys.play('levelUp');
    updatePlayerStats();
    
    alert("💪 TRAINING COMPLETE! (+50 XP)\nSystem entering cooldown mode.");
    showCooldownUI(); 
    
    // Trigger Cloud Sync
    if(typeof syncXPToCloud === 'function') syncXPToCloud(parseInt(localStorage.getItem('add_xp')));
}

window.skipDailyQuest = function() { 
    if(confirm("Skip training? (No XP will be awarded)")) {
        document.getElementById('system-alert').style.display = 'none'; 
    }
}

// =============================================================
// 🔥 6. ROADMAP & UTILS (Missing Handlers Fixed)
// =============================================================

window.handleLogout = function() { if(confirm("Disconnect?")) { localStorage.removeItem('user_info'); window.location.href = 'index.html'; } }
window.resetProgress = function() { 
    if(confirm("⚠️ WARNING: THIS CANNOT BE UNDONE.\nReset all Level & XP?")) { 
        
        // 1. Local Reset
        localStorage.setItem('add_xp', 0); 
        
        // 2. Cloud Reset (Database ko bhi 0 bhejo)
        if(typeof syncXPToCloud === 'function') {
            syncXPToCloud(0); 
        }

        location.reload(); 
    } 
}

window.openQuestLog = function() {
    const questSection = document.getElementById('quest-section');
    if(questSection) questSection.scrollIntoView({ behavior: 'smooth' });
    else alert("Quest Log System Active.");
};

window.openConfig = function() {
    const configPanel = document.getElementById('config-overlay');
    if(configPanel) {
        configPanel.classList.remove('hidden');
        configPanel.style.display = 'flex';
    } else {
        alert("⚙️ SYSTEM SETTINGS:\n\n- Audio: ON\n- Notifications: ENABLED\n- AI Agent: IGRIS (Active)");
    }
};

window.closeConfig = function() {
    const configPanel = document.getElementById('config-overlay');
    if(configPanel) configPanel.style.display = 'none';
}

window.openGrimoire = function() {
    const grimoirePanel = document.getElementById('grimoire-overlay');
    if(grimoirePanel) {
        grimoirePanel.classList.remove('hidden');
        grimoirePanel.style.display = 'flex';
        // Load data logic here if needed
    } else {
        alert("Grimoire is accessible inside Dungeon Mode.");
    }
}

window.openPathfinder = function() {
    const overlay = document.getElementById('roadmap-overlay');
    if(overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        if(typeof renderRoleHistory === 'function') renderRoleHistory();
        if(typeof injectHeaderControls === 'function') injectHeaderControls(); 
    }
}

function injectHeaderControls() {
    const header = document.querySelector('#roadmap-overlay .alert-header');
    if(!header) return;
    if(header.querySelector('.window-controls')) return; 

    const controls = document.createElement('div');
    controls.className = 'window-controls';
    controls.style.cssText = "display: flex; gap: 10px; align-items: center; margin-left: auto;";

    controls.innerHTML = `
        <button id="header-dl-btn" onclick="downloadRoadmap()" title="Download Intel" style="display:flex; background:var(--neon-gold); border:none; color:black; font-weight:bold; font-family:'Orbitron'; padding:5px 15px; cursor:pointer; gap:5px; align-items:center; border-radius:4px;">
            <i class="fas fa-file-download"></i> PDF
        </button>
        <button onclick="toggleFullscreen()" class="control-btn" title="Expand View" style="background:transparent; border:1px solid var(--neon-blue); color:var(--neon-blue); width:30px; height:30px; cursor:pointer; display:flex; justify-content:center; align-items:center; border-radius:4px;">
            <i class="fas fa-expand"></i>
        </button>
        <button onclick="closeOracle()" class="control-btn" style="background:transparent; border:1px solid #ff3333; color:#ff3333; width:30px; height:30px; cursor:pointer; display:flex; justify-content:center; align-items:center; border-radius:4px;" title="Close">
            <i class="fas fa-times"></i>
        </button>
    `;

    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.appendChild(controls);
}

window.toggleFullscreen = function() {
    const overlayBox = document.querySelector('#roadmap-overlay .alert-box');
    const icon = document.querySelector('.control-btn i.fa-expand, .control-btn i.fa-compress');
    
    if(overlayBox) overlayBox.classList.toggle('modal-fullscreen');

    if(overlayBox && overlayBox.classList.contains('modal-fullscreen')) {
        if(icon) { icon.classList.remove('fa-expand'); icon.classList.add('fa-compress'); }
    } else if(icon) {
        icon.classList.remove('fa-compress'); icon.classList.add('fa-expand'); 
    }
};

window.closeOracle = function() {
    const overlay = document.getElementById('roadmap-overlay');
    if(overlay) overlay.style.display = 'none';
    const overlayBox = overlay ? overlay.querySelector('.alert-box') : null;
    if(overlayBox) overlayBox.classList.remove('modal-fullscreen');
};

// 🔥 GENERATE ROADMAP
async function fetchRoadmap(savedRole = null) {
    const roleInput = document.getElementById('role-input');
    const role = savedRole || roleInput.value;
    if(!role) return alert("Please enter a role!");
    if(!savedRole) saveRoleHistory(role);

    const stepsContainer = document.getElementById('roadmap-steps');
    const loading = document.getElementById('roadmap-loading');
    
    if(stepsContainer) stepsContainer.innerHTML = '';
    if(loading) loading.classList.remove('hidden');
    
    try {
        const res = await fetch(`${API_BASE_URL}/generate-roadmap`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: role })
        });
        const data = await res.json();
        renderRoadmap(data.roadmap);
        if(loading) loading.classList.add('hidden');

    } catch (err) {
        // Fallback Mock Data
        const mockSteps = [
            { rank: "E-RANK", title: "Foundations", concepts: ["Basics", "Logic"], boss_project: "CLI Tool", boss_desc: "Understand the terminal." },
            { rank: "C-RANK", title: "Core Skills", concepts: ["Data Structures", "Algorithms"], boss_project: "Management System", boss_desc: "Build CRUD App." },
            { rank: "S-RANK", title: "Mastery", concepts: ["System Design", "Scalability"], boss_project: "Distributed System", boss_desc: "Handle 1M Users." }
        ];
        renderRoadmap(mockSteps);
        if(loading) loading.classList.add('hidden');
    }
}
window.fetchRoadmap = fetchRoadmap;

// --- UTILS ---
function saveRoleHistory(role) {
    let history = JSON.parse(localStorage.getItem('role_history')) || [];
    history = history.filter(r => r.toLowerCase() !== role.toLowerCase());
    history.unshift(role);
    if(history.length > 5) history.pop(); 
    localStorage.setItem('role_history', JSON.stringify(history));
    renderRoleHistory();
}

function renderRoleHistory() {
    const container = document.getElementById('role-history-container');
    if(!container) return;
    const history = JSON.parse(localStorage.getItem('role_history')) || [];
    container.innerHTML = history.map(role => `
        <div class="role-chip" onclick="setInputAndSearch('${role}')">
            ${role} <span class="delete-role" onclick="deleteRole(event, '${role}')">&times;</span>
        </div>
    `).join('');
}

window.setInputAndSearch = function(role) { document.getElementById('role-input').value = role; fetchRoadmap(role); }
window.deleteRole = function(e, role) { e.stopPropagation(); let history = JSON.parse(localStorage.getItem('role_history')) || []; history = history.filter(r => r !== role); localStorage.setItem('role_history', JSON.stringify(history)); renderRoleHistory(); }

function renderRoadmap(steps) {
    const container = document.getElementById('roadmap-steps');
    if(!container) return;
    container.innerHTML = '';
    steps.forEach(step => {
        let color = step.rank.includes('S-RANK') ? '#ff3333' : step.rank.includes('A-RANK') ? '#bd00ff' : '#00eaff';
        container.innerHTML += `
            <div style="border-left:3px solid ${color}; padding-left:20px; margin-bottom:30px; position:relative;">
                <div style="position:absolute; left:-11px; top:0; width:20px; height:20px; background:${color}; border-radius:50%;"></div>
                <h3 style="color:${color}; margin:0;">${step.rank}</h3>
                <div style="font-weight:bold; margin-bottom:5px;">${step.title}</div>
                <div style="font-size:0.9rem; color:#aaa;">${step.concepts.join(', ')}</div>
                <div style="margin-top:10px; border:1px solid ${color}; padding:10px; border-radius:5px; font-size:0.8rem;">
                    <strong style="color:${color}">BOSS: ${step.boss_project}</strong><br>${step.boss_desc}
                </div>
            </div>`;
    });
}


// =============================================================
// 🔥 ULTRA PDF (Screenshot Method — NO WHITE PAGE EVER)
// =============================================================
window.downloadRoadmap = async function () {
    const target = document.getElementById('roadmap-steps');
    if (!target) return alert("No Roadmap Found!");

    const btn = document.getElementById('header-dl-btn');
    const originalText = btn ? btn.innerHTML : "";

    if (btn) btn.innerHTML = "Preparing...";

    try {
        // Force black background temporarily
        const originalBg = target.style.background;
        target.style.background = "#000000";

        // Convert DOM to image
        const dataUrl = await domtoimage.toPng(target, {
            quality: 1,
            bgcolor: "#000000",
            width: target.scrollWidth,
            height: target.scrollHeight,
            style: {
                transform: 'scale(1)',
                transformOrigin: 'top left'
            }
        });

        // Create PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'px', 'a4');

        const img = new Image();
        img.src = dataUrl;

        img.onload = function () {
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (img.height * pdfWidth) / img.width;

            pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save("Hunter_Roadmap_Intel.pdf");

            if (btn) btn.innerHTML = originalText;
            target.style.background = originalBg;
        };

    } catch (err) {
        console.error(err);
        if (btn) btn.innerHTML = originalText;
        alert("PDF Failed");
    }
};



// =============================================================
// 🔥 7. ACADEMIC SYSTEM CONNECTION (NEW)
// =============================================================

window.openAcademicSystem = function() {
    

    if (savedBlueprint) {
        // ✅ Plan exists -> Enter Dashboard
        console.log("System: Academic Blueprint found. Accessing Dashboard...");
        
        // Optional: Play Sound
        if(window.audioSys && window.audioSys.play) window.audioSys.play('click');

        // Transition Effect
        document.body.style.transition = "opacity 0.5s";
        document.body.style.opacity = "0";
        
        setTimeout(() => {
            window.location.href = 'study-dashboard.html';
        }, 500);

    } else {
        // ❌ No Plan -> Redirect to Architect
        if(confirm("⚠ SYSTEM ALERT: No Academic Blueprint detected.\n\nInitialize 'The Architect' to create your semester strategy?")) {
            window.location.href = 'study-os.html';
        }
    }
};

// ============================================
// 🔥 CUSTOM SYSTEM CONFIRMATION (NO MORE BORING ALERTS)
// ============================================

let confirmResolver = null; // To store the Promise resolve function

function showSystemConfirm(title, message) {
    return new Promise((resolve) => {
        // 1. Set Content
        const modal = document.getElementById('custom-confirm-modal');
        const titleEl = modal.querySelector('h2');
        const msgEl = document.getElementById('confirm-msg');
        
        if (title) titleEl.innerText = title;
        if (message) msgEl.innerText = message;

        // 2. Show Modal with Animation
        modal.classList.remove('hidden');
        
        // 3. Play Notification Sound (If you have audio sys)
        if(window.audioSys) window.audioSys.play('hover'); // or 'alert'

        // 4. Store resolve for button clicks
        confirmResolver = resolve;
    });
}

function closeCustomConfirm(result) {
    const modal = document.getElementById('custom-confirm-modal');
    modal.classList.add('hidden');
    
    // Resolve the promise based on button click (True/False)
    if (confirmResolver) {
        confirmResolver(result);
        confirmResolver = null;
    }
}

// ============================================
// 🔄 UPDATED: ACADEMIC SYSTEM OPENER
// ============================================

// 🔥 Is function ko replace karein purane wale se
window.openAcademicSystem = async function() {
    const savedBlueprint = localStorage.getItem('hunter_blueprint');

    if (savedBlueprint) {
        console.log("System: Access Granted.");
        document.body.style.transition = "opacity 0.5s";
        document.body.style.opacity = "0";
        setTimeout(() => window.location.href = 'study-dashboard.html', 500);
    } else {
        // 👇 YAHAN MAGIC HOGA (Wait for user click)
        const userChoice = await showSystemConfirm(
            "BLUEPRINT NOT FOUND", 
            "The Architect requires a semester strategy to proceed."
        );

        if (userChoice === true) {
            // User clicked INITIALIZE
            window.location.href = 'study-os.html';
        } else {
            // User clicked DECLINE
            console.log("System: Initialization Aborted.");
        }
    }
};
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function runTextDecoder(element) {
  let iteration = 0;
  const originalText = element.dataset.value; // HTML में data-value एट्रिब्यूट होना चाहिए
  
  clearInterval(element.interval);
  
  element.interval = setInterval(() => {
    element.innerText = originalText
      .split("")
      .map((letter, index) => {
        if(index < iteration) {
          return originalText[index];
        }
        return letters[Math.floor(Math.random() * 26)];
      })
      .join("");
    
    if(iteration >= originalText.length){ 
      clearInterval(element.interval);
    }
    
    iteration += 1 / 3; // स्पीड कंट्रोल (जितना कम, उतना स्लो)
  }, 30);
}

function initSpotlightEffect() {
  const cards = document.querySelectorAll(".dungeon-card"); // या .spotlight-card

  document.getElementById("recents-grid").onmousemove = e => {
    for(const card of cards) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    }
  };
}

// पेज लोड होने पर कॉल करें
// window.onload में: initSpotlightEffect();



// --- GUILD FAMILIAR LOGIC (COMPLETE SYSTEM) ---

let petClickCount = 0;
let roamInterval;

// Positions CSS classes
const positions = [
    'pos-bottom-right',
    'pos-bottom-left', 
    'pos-side-right',
    'pos-side-left'
];

// 1. START PET SYSTEM
window.showGuildPet = function() {
    const pet = document.getElementById('guild-familiar-container');
    if(pet) {
        console.log("👻 Summoning Familiar...");
        pet.classList.remove('hidden'); // Ensure it's not hidden via CSS
        
        petClickCount = 0; // Reset clicks
        movePetRandomly(); // Move immediately
        
        // Clear existing interval if any
        if(roamInterval) clearInterval(roamInterval);
        
        // Start roaming every 15 seconds
        roamInterval = setInterval(movePetRandomly, 15000); 
    }
}

// 2. MOVEMENT LOGIC
function movePetRandomly() {
    const pet = document.getElementById('guild-familiar-container');
    const card = document.getElementById('familiar-status-card');
    
    if(!pet) return;

    // Move hone se pehle card ko chupao (taaki hawa me na latke)
    if(card) card.classList.add('hidden');

    // Step A: Hide (Fade Out)
    pet.classList.remove('visible'); 

    // Step B: Wait 1s, Move & Show
    setTimeout(() => {
        // Remove old position classes
        pet.classList.remove(...positions);

        // Pick new random position
        const randomPos = positions[Math.floor(Math.random() * positions.length)];
        
        // Add new position & show
        pet.classList.add(randomPos);
        pet.classList.add('visible');
        
        console.log(`Pet moved to: ${randomPos}`);
    }, 1000);
}

// 3. CLICK INTERACTION (Ye Missing Tha!)
window.interactWithPet = function() {
    const card = document.getElementById('familiar-status-card');
    const pet = document.getElementById('guild-familiar-container');
    
    petClickCount++;
    console.log(`Pet Clicked: ${petClickCount}/3`);

    // --- CASE A: 3 Baar Click kiya -> GAYAB ---
    if (petClickCount >= 3) {
        if(card) card.classList.add('hidden'); // Card chupao
        if(pet) {
            pet.classList.remove('visible'); // Pet fade out
            setTimeout(() => pet.classList.add('hidden'), 500); // Fully hide
        }
        clearInterval(roamInterval); // Ghumana band
        alert("Pet is tired and went to sleep. (Re-open Guild to summon)");
        return;
    }

    // --- CASE B: Normal Click -> Show/Hide Details ---
    if (card) {
        if (card.classList.contains('hidden')) {
            updateFriendStatus(); // Naya data load karo
            card.classList.remove('hidden'); // Show Card
        } else {
            card.classList.add('hidden'); // Hide Card
        }
    }
}

// 4. DATA UPDATE (Fake Friend Info)
function updateFriendStatus() {
    const friends = [
        { name: "Rhea", action: "Watching: Digital Electronics", mood: "🤔 Thinking" },
        { name: "Aman", action: "Solving: K-Map Quiz", mood: "🔥 Focused" },
        { name: "Kabir", action: "Idle in Lobby", mood: "💤 Sleepy" },
        { name: "Sanya", action: "Quest: 4-Bit Adder", mood: "⚔️ Battling" }
    ];
    
    // Pick Random Friend
    const data = friends[Math.floor(Math.random() * friends.length)];

    // Update HTML
    const nameEl = document.getElementById('friend-name');
    const actEl = document.getElementById('friend-activity');
    const moodEl = document.getElementById('friend-mood');

    if(nameEl) nameEl.innerText = data.name;
    if(actEl) actEl.innerText = data.action;
    if(moodEl) moodEl.innerText = data.mood;
}

// 5. MANUAL HIDE
window.hidePet = function() {
    const pet = document.getElementById('guild-familiar-container');
    if(pet) {
        pet.classList.remove('visible');
        clearInterval(roamInterval);
    }
}

// 🔥 AUTO START (Testing ke liye)
setTimeout(() => {
    if(typeof window.showGuildPet === "function") {
        window.showGuildPet();
    }
}, 1000);