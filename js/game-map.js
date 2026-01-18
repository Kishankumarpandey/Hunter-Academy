// js/game-map.js

// =============================================================
// 🔥 1. INITIALIZATION & LOAD
// =============================================================

// Global variable to track previous level (for Level Up Popup)
let previousLevel = 0; 

window.onload = function() {
    // 1. Calculate Stats immediately
    updatePlayerStats(); 
    
    // 2. Load History
    loadRecentDungeons(); 
    
    // 3. Check for Daily Quest Reset
    checkDailyQuest();
    
    // 4. Check Hybrid Login (Display Name from LocalStorage)
    const userStr = localStorage.getItem('user_info');
    if(userStr) {
        const user = JSON.parse(userStr);
        document.getElementById('player-name').innerText = user.displayName.toUpperCase();
        const avatar = document.querySelector('.avatar-img');
        if(avatar && user.photoURL) avatar.src = user.photoURL;
    }
};

// =============================================================
// 🔥 2. CORE STATS LOGIC (Leveling System)
// =============================================================

function updatePlayerStats() {
    let totalXP = parseInt(localStorage.getItem('add_xp') || "0");
    
    // Formula: 100 XP = 1 Level
    let currentLevel = Math.floor(totalXP / 100) + 1;
    let currentBarXP = totalXP % 100;
    
    // 🔥 CHECK LEVEL UP EVENT
    if (previousLevel !== 0 && currentLevel > previousLevel) {
        showLevelUp(previousLevel, currentLevel);
        if(window.audioSys) audioSys.play('levelUp'); 
    }
    previousLevel = currentLevel; // Update tracker

    // Update UI Text
    document.getElementById('player-lvl').innerText = currentLevel;
    document.getElementById('player-rank').innerText = getRankName(currentLevel);
    
    // Update Attributes (Auto-scaling)
    document.getElementById('stat-str').innerText = 10 + (currentLevel * 2);
    document.getElementById('stat-int').innerText = 10 + (currentLevel * 2);
    document.getElementById('stat-agi').innerText = 10 + (currentLevel * 1);

    // Update XP Bar
    document.getElementById('xp-text').innerText = `${currentBarXP} / 100 XP`;
    let percentage = (currentBarXP / 100) * 100;
    document.getElementById('xp-bar').style.width = `${percentage}%`;
}

// Helper: Get Rank Name based on Level
function getRankName(level) {
    if (level >= 50) return "S-RANK";
    if (level >= 30) return "A-RANK";
    if (level >= 20) return "B-RANK";
    if (level >= 10) return "C-RANK";
    if (level >= 5) return "D-RANK";
    return "E-RANK";
}

// =============================================================
// 🔥 3. LEVEL UP POPUP HANDLERS
// =============================================================

function showLevelUp(oldLvl, newLvl) {
    const overlay = document.getElementById('levelup-overlay');
    
    document.getElementById('lvl-old').innerText = oldLvl;
    document.getElementById('lvl-new').innerText = newLvl;
    
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
}

// Make this global so the HTML button can call it
window.closeLevelUp = function() {
    document.getElementById('levelup-overlay').style.display = 'none';
}

// =============================================================
// 🔥 4. DUNGEON HISTORY SYSTEM
// =============================================================

// js/game-map.js

async function enterGate() {
    const urlInput = document.getElementById('dashboard-url');
    const url = urlInput.value.trim();
    const btn = document.querySelector('.enter-btn');

    // 1. Validation
    if (!url) return alert("⚠️ SYSTEM ERROR: KEYSTONE MISSING (Please paste a YouTube URL)");

    // 2. Button Loading State (Visual Feedback)
    const originalText = btn.innerText;
    btn.innerText = "⏳ OPENING GATE...";
    btn.disabled = true;
    btn.style.opacity = "0.7";

    try {
        console.log("📡 Contacting Server for Dungeon Data...");

        // 3. Server Request
        const res = await fetch('/generate-dungeon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: url })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Server rejected the key.");
        }

        console.log("✅ Dungeon Generated:", data);

        // 4. Save Data to LocalStorage (Game isme se padhega)
        localStorage.setItem('dungeon_data', JSON.stringify(data));
        localStorage.setItem('mission_url', url); // For Resume

        // Save to History
        saveHistory({
            url: url,
            title: data.summary[0] || "Unknown Dungeon", // Pehla point as title
            thumb: `https://img.youtube.com/vi/${getYouTubeID(url)}/mqdefault.jpg`,
            timestamp: Date.now()
        });

        // 5. Animation & Redirect
        btn.innerText = "GATE OPEN!";
        btn.style.background = "#00ff00"; // Green Success
        
        document.body.style.transition = "opacity 0.5s";
        document.body.style.opacity = "0";

        setTimeout(() => {
            window.location.href = 'study-game.html'; // 👈 Yahan Game page par bhej rahe hain
        }, 800);

    } catch (error) {
        console.error("❌ Gate Error:", error);
        alert(`🚫 GATE BLOCKED: ${error.message}\n(Make sure 'node server.js' is running)`);
        
        // Reset Button
        btn.innerText = originalText;
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.background = "";
    }
}

// Helper to get YouTube ID for Thumbnail
function getYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function saveHistory(newEntry) {
    let history = JSON.parse(localStorage.getItem('dungeon_history')) || [];
    // Remove duplicate
    history = history.filter(h => h.url !== newEntry.url);
    // Add to top
    history.unshift(newEntry);
    // Limit to 6 items
    if(history.length > 6) history.pop();
    localStorage.setItem('dungeon_history', JSON.stringify(history));
}

function startMission(videoUrl) {
    localStorage.setItem('mission_url', videoUrl);
    // Animation Effect
    document.body.style.opacity = "0";
    setTimeout(() => {
        window.location.href = 'study-game.html';
    }, 500);
}

function loadRecentDungeons() {
    const grid = document.getElementById('recents-grid');
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
            <div class="card-meta">
                <span><i class="fas fa-play-circle"></i> RESUME</span>
            </div>
            <div style="width:100%; height:4px; background:#333; border-radius:2px; margin-top:10px;">
                <div style="width:100%; height:100%; background:var(--neon-blue);"></div>
            </div>
        </div>
    `).join('');
}

// Make global for onclick events
window.startMission = startMission;

window.removeFromHistory = function(e, url) {
    e.stopPropagation(); 
    let history = JSON.parse(localStorage.getItem('dungeon_history')) || [];
    history = history.filter(h => h.url !== url);
    localStorage.setItem('dungeon_history', JSON.stringify(history));
    loadRecentDungeons();
}

function clearHistory() {
    if(confirm("DELETE DUNGEON LOGS?")) {
        localStorage.removeItem('dungeon_history');
        loadRecentDungeons();
    }
}

// =============================================================
// 🔥 5. QUEST & COOLDOWN LOGIC
// =============================================================

function checkDailyQuest() {
    const COOLDOWN_TIME = 4 * 60 * 60 * 1000; 
    const lastTime = parseInt(localStorage.getItem('last_quest_time') || "0");
    const currentTime = Date.now();
    if (currentTime - lastTime > COOLDOWN_TIME) {
        showQuestOverlay();
    }
}

window.forceDailyQuest = function() { showQuestOverlay(); }

function showQuestOverlay() {
    document.getElementById('system-alert').classList.remove('hidden');
    document.getElementById('system-alert').style.display = 'flex';
    resetQuestUI();
    if(window.audioSys) audioSys.play('click');
}

function resetQuestUI() {
    document.querySelectorAll('.quest-item input').forEach(input => {
        if(!input.disabled) { input.checked = false; input.parentElement.classList.remove('completed'); }
    });
    const btn = document.getElementById('claim-btn');
    btn.innerText = "INCOMPLETE"; btn.classList.remove('ready', 'btn-claim'); btn.classList.add('btn-claim');
}

window.toggleTask = function(element) {
    const checkbox = element.querySelector('input');
    if (checkbox.checked) element.classList.add('completed'); else element.classList.remove('completed');
    
    const allChecked = document.querySelectorAll('.quest-item input:checked').length === 3;
    const btn = document.getElementById('claim-btn');
    
    if(allChecked) { 
        btn.innerText = "CLAIM REWARD"; 
        btn.classList.add('ready'); 
    } else { 
        btn.innerText = "INCOMPLETE"; 
        btn.classList.remove('ready'); 
    }
}

window.completeDailyQuest = function() {
    const btn = document.getElementById('claim-btn');
    if (!btn.classList.contains('ready')) return;
    
    const rewardXP = 50; 

    // 1. Local Update
    let currentTotal = parseInt(localStorage.getItem('add_xp') || "0");
    localStorage.setItem('add_xp', currentTotal + rewardXP);
    
    // 2. Cooldown Set
    localStorage.setItem('last_quest_time', Date.now().toString());
    
    // 3. UI Close
    document.getElementById('system-alert').style.display = 'none';
    
    if(window.audioSys) audioSys.play('levelUp');
    
    // 4. Update UI
    updatePlayerStats();
    
    // 🔥 5. SEND TO CLOUD (LEADERBOARD UPDATE) 🔥
    if (window.syncXPToCloud) {
        window.syncXPToCloud(rewardXP); 
    } else {
        console.warn("Cloud sync not ready yet.");
    }
}

window.skipDailyQuest = function() {
    if(confirm("Skip training?")) document.getElementById('system-alert').style.display = 'none';
}

// =============================================================
// 🔥 6. UTILS & MODULES (Roadmap, Grimoire, Config)
// =============================================================

window.handleLogout = function() {
    if(confirm("⚠️ SYSTEM ALERT: Disconnect from the System?")) {
        localStorage.removeItem('user_info');
        if(window.audioSys) audioSys.play('click');
        window.location.href = 'index.html'; 
    }
}

window.resetProgress = function() {
    if(confirm("⚠️ WARNING: SYSTEM RESET! All Stats & XP will be lost. Proceed?")) {
        localStorage.setItem('add_xp', 0);
        localStorage.removeItem('hunter_stats');
        location.reload();
    }
}

// --- ROADMAP ---
window.openPathfinder = function() { document.getElementById('roadmap-overlay').classList.remove('hidden'); document.getElementById('roadmap-overlay').style.display = 'flex'; renderRoleHistory(); }

async function fetchRoadmap(savedRole = null) {
    const roleInput = document.getElementById('role-input');
    const role = savedRole || roleInput.value;
    if(!role) return alert("Please enter a role!");
    if(!savedRole) saveRoleHistory(role);

    document.getElementById('roadmap-steps').innerHTML = '';
    document.getElementById('roadmap-loading').classList.remove('hidden');
    try {
        const res = await fetch('/generate-roadmap', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: role })
        });
        const data = await res.json();
        renderRoadmap(data.roadmap);
        document.getElementById('roadmap-loading').classList.add('hidden');
    } catch (err) {
        alert("The Oracle is busy.");
        document.getElementById('roadmap-loading').classList.add('hidden');
    }
}
window.fetchRoadmap = fetchRoadmap; // Make global

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

// --- GRIMOIRE ---
window.openGrimoire = function() {
    const overlay = document.getElementById('grimoire-overlay');
    const container = document.getElementById('grimoire-content');
    const notes = JSON.parse(localStorage.getItem('saved_notes')) || [];
    container.innerHTML = '';
    if (notes.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#555; margin-top:50px;">GRIMOIRE IS EMPTY.<br><small>Go to Dungeons and save notes.</small></div>`;
    } else {
        notes.forEach((note, index) => {
            container.innerHTML += `
                <div class="grimoire-card" id="note-${index}">
                    <div onclick="toggleNote(${index})" style="padding:15px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2);">
                        <div><h3 style="margin:0; color:var(--neon-gold); font-family:'Orbitron'; font-size:1rem;">${note.title}</h3><small style="color:#666;">Captured on: ${note.date}</small></div>
                        <div><i class="fas fa-chevron-down" style="color:#aaa;"></i></div>
                    </div>
                    <div id="note-body-${index}" style="display:none; padding:15px; border-top:1px dashed #333; color:#ccc; font-size:0.9rem;">
                        <p style="font-style:italic; color:#888; margin-bottom:15px;">${note.data.summary || 'No summary.'}</p>
                        ${renderNoteSections(note.data.sections)}
                        <div style="margin-top:15px; text-align:right;"><button onclick="deleteNote(${index})" style="background:transparent; border:1px solid #ff3333; color:#ff3333; padding:5px 10px; cursor:pointer; border-radius:4px; font-size:0.8rem;">BURN PAGE</button></div>
                    </div>
                </div>`;
        });
    }
    overlay.classList.remove('hidden'); overlay.style.display = 'flex';
}

function renderNoteSections(sections) {
    if(!sections) return '';
    return sections.map(sec => `<div style="margin-bottom:10px;"><strong style="color:var(--neon-blue)">${sec.heading}</strong><div style="background:rgba(0,0,0,0.3); padding:8px; border-radius:4px; margin-top:5px;">${sec.content}</div></div>`).join('');
}
window.toggleNote = function(index) { const body = document.getElementById(`note-body-${index}`); body.style.display = body.style.display === 'none' ? 'block' : 'none'; }
window.deleteNote = function(index) { if(confirm("Burn this page from your Grimoire?")) { let notes = JSON.parse(localStorage.getItem('saved_notes')) || []; notes.splice(index, 1); localStorage.setItem('saved_notes', JSON.stringify(notes)); openGrimoire(); } }

// --- QUEST LOG ---
window.openQuestLog = function() {
    document.getElementById('quest-log-overlay').classList.remove('hidden');
    document.getElementById('quest-log-overlay').style.display = 'flex';
    const list = document.getElementById('quest-log-content');
    const quests = JSON.parse(localStorage.getItem('active_quests')) || [];
    list.innerHTML = "";
    if(quests.length === 0) { list.innerHTML = "<div style='text-align:center; color:#555;'>NO ACTIVE CONTRACTS</div>"; return; }
    quests.forEach(q => {
        list.innerHTML += `<div style="background:rgba(0,0,0,0.3); border:1px solid #333; padding:15px; margin-bottom:10px; border-radius:5px;"><div style="display:flex; justify-content:space-between;"><strong style="color:white;">${q.title}</strong><span style="color:var(--neon-blue); font-size:0.8rem;">${q.rank}</span></div><p style="color:#aaa; font-size:0.9rem; margin-top:5px;">${q.desc}</p></div>`;
    });
}

// --- CONFIG ---
window.openConfig = function() { document.getElementById('config-overlay').classList.remove('hidden'); loadSavedPreference(); }
window.closeConfig = function() { document.getElementById('config-overlay').classList.add('hidden'); }
window.selectRewardType = function(type, element) { localStorage.setItem('hunterRewardType', type); document.querySelectorAll('.reward-chip').forEach(chip => { chip.classList.remove('active-chip'); }); element.classList.add('active-chip'); }
function loadSavedPreference() { const savedType = localStorage.getItem('hunterRewardType') || 'kings'; const chips = document.querySelectorAll('.reward-chip'); chips.forEach(chip => { chip.classList.remove('active-chip'); if(chip.getAttribute('onclick').includes(`'${savedType}'`)) { chip.classList.add('active-chip'); } }); }