// js/game-map.js

// =============================================================
// 🔥 1. INITIALIZATION & LOAD
// =============================================================

let previousLevel = 0; 

window.onload = function() {
    updatePlayerStats(); 
    loadRecentDungeons(); 
    checkDailyQuest();
    
    // Inject Header Controls if Roadmap is already open
    if(!document.getElementById('roadmap-overlay').classList.contains('hidden')) {
        injectHeaderControls();
    }

    const userStr = localStorage.getItem('user_info');
    if(userStr) {
        const user = JSON.parse(userStr);
        document.getElementById('player-name').innerText = user.displayName.toUpperCase();
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
        if(window.audioSys) audioSys.play('levelUp'); 
    }
    previousLevel = currentLevel; 

    document.getElementById('player-lvl').innerText = currentLevel;
    document.getElementById('player-rank').innerText = getRankName(currentLevel);
    document.getElementById('stat-str').innerText = 10 + (currentLevel * 2);
    document.getElementById('stat-int').innerText = 10 + (currentLevel * 2);
    document.getElementById('stat-agi').innerText = 10 + (currentLevel * 1);
    document.getElementById('xp-text').innerText = `${currentBarXP} / 100 XP`;
    document.getElementById('xp-bar').style.width = `${(currentBarXP / 100) * 100}%`;
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
    document.getElementById('lvl-old').innerText = oldLvl;
    document.getElementById('lvl-new').innerText = newLvl;
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
}

window.closeLevelUp = function() {
    document.getElementById('levelup-overlay').style.display = 'none';
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
        const res = await fetch('/generate-dungeon', {
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
            title: data.summary[0] || "Unknown Dungeon",
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

function getYouTubeID(url) {
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

function startMission(videoUrl) {
    localStorage.setItem('mission_url', videoUrl);
    document.body.style.opacity = "0";
    setTimeout(() => window.location.href = 'study-game.html?fresh=' + Date.now(), 500);

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
            <div class="card-meta"><span><i class="fas fa-play-circle"></i> RESUME</span></div>
            <div style="width:100%; height:4px; background:#333; border-radius:2px; margin-top:10px;">
                <div style="width:100%; height:100%; background:var(--neon-blue);"></div>
            </div>
        </div>
    `).join('');
}

window.startMission = startMission;
window.removeFromHistory = function(e, url) { e.stopPropagation(); let history = JSON.parse(localStorage.getItem('dungeon_history')) || []; history = history.filter(h => h.url !== url); localStorage.setItem('dungeon_history', JSON.stringify(history)); loadRecentDungeons(); }
function clearHistory() { if(confirm("DELETE DUNGEON LOGS?")) { localStorage.removeItem('dungeon_history'); loadRecentDungeons(); } }

// =============================================================
// 🔥 5. QUEST LOGIC
// =============================================================

function checkDailyQuest() {
    const COOLDOWN_TIME = 4 * 60 * 60 * 1000; 
    const lastTime = parseInt(localStorage.getItem('last_quest_time') || "0");
    if (Date.now() - lastTime > COOLDOWN_TIME) showQuestOverlay();
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
    if(document.querySelectorAll('.quest-item input:checked').length === 3) { 
        document.getElementById('claim-btn').innerText = "CLAIM REWARD"; 
        document.getElementById('claim-btn').classList.add('ready'); 
    } else { 
        document.getElementById('claim-btn').innerText = "INCOMPLETE"; 
        document.getElementById('claim-btn').classList.remove('ready'); 
    }
}

window.completeDailyQuest = function() {
    if (!document.getElementById('claim-btn').classList.contains('ready')) return;
    const rewardXP = 50; 
    localStorage.setItem('add_xp', parseInt(localStorage.getItem('add_xp') || "0") + rewardXP);
    localStorage.setItem('last_quest_time', Date.now().toString());
    document.getElementById('system-alert').style.display = 'none';
    if(window.audioSys) audioSys.play('levelUp');
    updatePlayerStats();
}

window.skipDailyQuest = function() { if(confirm("Skip training?")) document.getElementById('system-alert').style.display = 'none'; }

// =============================================================
// 🔥 6. UTILS
// =============================================================

window.handleLogout = function() { if(confirm("Disconnect?")) { localStorage.removeItem('user_info'); window.location.href = 'index.html'; } }
window.resetProgress = function() { if(confirm("RESET ALL PROGRESS?")) { localStorage.setItem('add_xp', 0); location.reload(); } }

// =============================================================
// 🔥 7. ROADMAP SYSTEM (FIXED: BLACK PDF & FULLSCREEN)
// =============================================================

window.openPathfinder = function() {
    const overlay = document.getElementById('roadmap-overlay');
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    renderRoleHistory();
    injectHeaderControls(); // 🔥 Buttons hamesha add honge
}

function injectHeaderControls() {
    const header = document.querySelector('#roadmap-overlay .alert-header');
    if(!header) return;
    if(header.querySelector('.window-controls')) return; 

    const controls = document.createElement('div');
    controls.className = 'window-controls';
    controls.style.cssText = "display: flex; gap: 10px; align-items: center; margin-left: auto;";

    // 🔥 FIX: display:flex (Always Visible)
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

// 🔥 FIXED FULLSCREEN (Clean View - Only Roadmap)
window.toggleFullscreen = function() {
    const overlayBox = document.querySelector('#roadmap-overlay .alert-box');
    const icon = document.querySelector('.control-btn i.fa-expand, .control-btn i.fa-compress');
    
    // Toggle Class (CSS handles size and hiding search bar)
    overlayBox.classList.toggle('modal-fullscreen');

    // Toggle Icon
    if(overlayBox.classList.contains('modal-fullscreen')) {
        if(icon) { icon.classList.remove('fa-expand'); icon.classList.add('fa-compress'); }
    } else {
        if(icon) { icon.classList.remove('fa-compress'); icon.classList.add('fa-expand'); }
    }
};

window.closeOracle = function() {
    const overlay = document.getElementById('roadmap-overlay');
    overlay.style.display = 'none';
    const overlayBox = overlay.querySelector('.alert-box');
    if(overlayBox) overlayBox.classList.remove('modal-fullscreen');
};

// =============================================================
// 🔥 PRO PDF ENGINE (NO WHITE PAGE, NO UI GLITCH)
// =============================================================

// Clean printable version builder
function buildCleanPDFLayout() {
    const source = document.getElementById('roadmap-steps');
    if (!source) return null;

    const clean = document.createElement('div');
    clean.id = "temp-pdf-container";

    clean.style.cssText = `
        background:#000000;
        color:#ffffff;
        padding:40px;
        width:800px;
        font-family: Arial, sans-serif;
        line-height:1.6;
    `;

    clean.innerHTML = `
        <h1 style="color:#00eaff; text-align:center; margin-bottom:25px;">
            HUNTER ROADMAP INTEL
        </h1>
        <hr style="border:1px solid #00eaff; margin-bottom:30px;">
    `;

    // Only roadmap cards clone
    const cards = source.querySelectorAll('div[style*="border-left"]');

    cards.forEach(card => {
        const clone = card.cloneNode(true);

        clone.style.background = "#111";
        clone.style.marginBottom = "25px";
        clone.style.padding = "20px";
        clone.style.borderRadius = "8px";

        clean.appendChild(clone);
    });

    return clean;
}

// =============================================================
// 🔥 FIXED DOWNLOAD FUNCTION
// =============================================================
window.downloadRoadmap = function () {
    const pdfLayout = buildCleanPDFLayout();
    if (!pdfLayout) {
        alert("⚠️ No Roadmap Found!");
        return;
    }

    // Hidden attach
    pdfLayout.style.position = "fixed";
    pdfLayout.style.top = "-9999px";
    document.body.appendChild(pdfLayout);

    const btn = document.getElementById('header-dl-btn');
    const originalText = btn ? btn.innerHTML : "";

    if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PREPARING...`;

    const opt = {
        margin: 0.5,
        filename: 'Hunter_Roadmap_Intel.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
            scale: 2,
            backgroundColor: "#000000",
        },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(pdfLayout).save().then(() => {
        pdfLayout.remove();

        if (btn) {
            btn.innerHTML = `<i class="fas fa-check"></i> SAVED`;
            setTimeout(() => btn.innerHTML = originalText, 2000);
        }
    }).catch(err => {
        console.error("PDF Error:", err);
        pdfLayout.remove();
        if (btn) btn.innerHTML = originalText;
        alert("PDF Generation Failed.");
    });
};


// 🔥 GENERATE ROADMAP (Standard)
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
        // Fallback Mock Data
        const mockSteps = [
            { rank: "E-RANK", title: "Foundations", concepts: ["Basics", "Logic"], boss_project: "CLI Tool", boss_desc: "Understand the terminal." },
            { rank: "C-RANK", title: "Core Skills", concepts: ["Data Structures", "Algorithms"], boss_project: "Management System", boss_desc: "Build CRUD App." },
            { rank: "S-RANK", title: "Mastery", concepts: ["System Design", "Scalability"], boss_project: "Distributed System", boss_desc: "Handle 1M Users." }
        ];
        renderRoadmap(mockSteps);
        document.getElementById('roadmap-loading').classList.add('hidden');
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

