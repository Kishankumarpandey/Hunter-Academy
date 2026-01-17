
import { syncXPToCloud } from "./hunter-db.js";

// --- STATE VARIABLES ---
let player;
let quizData = [];
let summaryData = [];
let nextTriggerTime = 0;
let currentQIndex = 0;
let isQuizActive = false;
let checkInterval;
let isManual = false;
let correctAnswers = 0; 
let totalAnswered = 0; 

// 🔥 NEW: SESSION STATE (Anti-Cheat System)
let sessionXP = 0; // Ye Temporary XP hai (Save nahi hoga jab tak complete na ho)
let isDungeonCleared = false; // Video finish flag

// Variables for Grimoire & Quests
let currentNoteData = null; 
let currentGeneratedProjects = [];

// --- AUDIO SYSTEM INTEGRATION ---
document.body.addEventListener('click', () => {
    if (window.audioSys && window.audioSys.startBGM) window.audioSys.startBGM();
}, { once: true });

// --- ON LOAD ---
window.onload = function() {
    const savedUrl = localStorage.getItem('mission_url');
    if (savedUrl) {
        const urlInput = document.getElementById('yt-url');
        if (urlInput) {
            urlInput.value = savedUrl;
            if (typeof scanGateKey === 'function') {
                scanGateKey();
            }
        }
    }
};

// --- HELPER: GET VIDEO TITLE ---
async function getVideoTitle(videoUrl) {
    try {
        const res = await fetch(`https://noembed.com/embed?url=${videoUrl}`);
        const data = await res.json();
        return data.title || "Coding Concept";
    } catch (e) {
        return "Advanced Engineering Topic";
    }
}

// --- MANUAL MODE TOGGLE ---
function toggleManual() {
    isManual = !isManual;
    const container = document.getElementById('manual-container');
    const btn = document.getElementById('toggle-btn');

    if (isManual) {
        container.classList.remove('hidden');
        container.style.display = 'block';
        btn.innerText = "[ DISABLE MANUAL MODE ]";
        btn.style.color = "#ff3333";
        btn.style.borderColor = "#ff3333";
    } else {
        container.classList.add('hidden');
        container.style.display = 'none';
        btn.innerText = "[ ENABLE MANUAL TRANSCRIPT MODE ]";
        btn.style.color = "#777";
        btn.style.borderColor = "#555";
    }
}

// --- INIT DUNGEON ---
async function initDungeon() {
    const url = document.getElementById('yt-url').value;
    const text = document.getElementById('manual-text') ? document.getElementById('manual-text').value : "";

    if (!url && !isManual) return alert("PLEASE PASTE YOUTUBE URL (For Video Player)!");
    if (isManual && !text) return alert("PLEASE PASTE TRANSCRIPT TEXT (For AI)!");

    if (window.audioSys) audioSys.play('click');
    document.getElementById('input-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');

    try {
        const payload = isManual ? { transcriptText: text } : { videoUrl: url };

        const res = await fetch('/generate-dungeon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Server Error");
        const rawText = await res.text();
        const data = JSON.parse(rawText);
        if (data.error) throw new Error(data.error);

        quizData = data.questions;
        summaryData = data.summary;

        if (summaryData) {
            const summaryLog = document.getElementById('summary-log');
            if (summaryLog) {
                summaryLog.innerHTML = `<strong>MISSION OBJECTIVES:</strong><br> ${summaryData.map(s => `> ${s}`).join('<br>')}`;
            }
        }

        const videoId = extractVideoID(url);
        loadVideo(videoId);

        // Auto Scroll
        setTimeout(() => {
            const questSection = document.getElementById('quest-section');
            if (questSection) {
                questSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 2000);

    } catch (err) {
        console.error(err);
        alert("ERROR: " + err.message);
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('input-screen').classList.remove('hidden');
    }
}

function extractVideoID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function goFullScreen() {
    var elem = document.getElementById("master-container"); 
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
}

// --- YOUTUBE PLAYER CONFIG ---
function loadVideo(vidId) {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('game-screen').style.display = 'block';

    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: vidId,
        playerVars: { 
            'autoplay': 1, 
            'controls': 1, 
            'rel': 0, 
            'fs': 0,       
            'modestbranding': 1 
        },
        events: { 
            'onReady': onPlayerReady, 
            'onStateChange': onPlayerStateChange // 🔥 Important State Listener
        }
    });
}

function onPlayerReady(event) {
    nextTriggerTime = 10;
    currentQIndex = 0;
    if (window.audioSys) audioSys.startBGM();
}

// 🔥 CORE LOGIC: DETECT VIDEO END & UNLOCK REWARD
function onPlayerStateChange(event) {
    // 1 = Playing
    if (event.data == YT.PlayerState.PLAYING) {
        checkInterval = setInterval(checkTime, 1000);
    } else {
        clearInterval(checkInterval);
    }

    // 🔥 0 = ENDED (Video khatam hua)
    if (event.data == YT.PlayerState.ENDED) {
        unlockDungeonCompletion();
    }
}

// 🔥 BUTTON UNLOCKER
function unlockDungeonCompletion() {
    if (isDungeonCleared) return; // Already unlocked
    
    isDungeonCleared = true;
    console.log("DUNGEON CLEARED! UNLOCKING EXIT...");
    
    const btn = document.querySelector('.complete-btn');
    if (btn) {
        btn.classList.add('unlocked'); // CSS se display:block hoga
        if (window.audioSys) audioSys.play('success');
    }
}

function checkTime() {
    if (isQuizActive) return;
    if (!isQuizSystemOnline) return; 

    const currentTime = player.getCurrentTime();
    if (currentTime >= nextTriggerTime && currentQIndex < quizData.length) {
        triggerQuiz(quizData[currentQIndex]);
    }
}

// --- QUIZ LOGIC ---
function triggerQuiz(question) {
    isQuizActive = true;
    player.pauseVideo();
    if (window.audioSys) audioSys.play('success');

    const overlay = document.getElementById('quiz-overlay');
    overlay.classList.add('active');
    overlay.style.display = 'flex';

    document.getElementById('q-text').innerText = question.question;
    const optDiv = document.getElementById('q-options');
    optDiv.innerHTML = '';

    question.options.forEach((opt, i) => {
        optDiv.innerHTML += `
            <button class="opt-btn" onclick="handleAnswer(this, ${i}, ${question.correctIndex})">
                ${String.fromCharCode(65 + i)}. ${opt}
            </button>`;
    });

    document.getElementById('resume-btn').style.display = 'none';
}

window.handleAnswer = function(btn, selected, correct) {
    if (btn.parentElement.classList.contains('locked')) return;
    btn.parentElement.classList.add('locked');

    totalAnswered++; 

    if (selected === correct) {
        correctAnswers++;
        btn.classList.add('correct');
        if (window.audioSys) audioSys.play('success');
        setTimeout(() => { showGift(); }, 600);
    } else {
        btn.classList.add('wrong');
        if (window.audioSys) audioSys.play('fail');
        btn.parentElement.children[correct].classList.add('correct');

        const resBtn = document.getElementById('resume-btn');
        resBtn.style.display = 'block';
        resBtn.innerText = "INCORRECT! CONTINUE >>";
        resBtn.style.background = "var(--neon-red)";
    }
}

function showGift() {
    document.getElementById('quiz-overlay').style.display = 'none';
    const giftOverlay = document.getElementById('gift-overlay');
    giftOverlay.classList.remove('hidden');
    giftOverlay.style.display = 'flex';
}

window.resumeVideo = function() {
    document.getElementById('quiz-overlay').style.display = 'none';
    isQuizActive = false;
    nextTriggerTime = player.getCurrentTime() + 30; 
    currentQIndex++;
    player.playVideo();
    if (window.audioSys) audioSys.startBGM();
}

// =============================================================
// 🔥 1. GRIMOIRE SYSTEM (FULL CODE) 🔥
// =============================================================

async function extractNotes() {
    document.getElementById('project-list').innerHTML = '';
    document.getElementById('project-loading').classList.add('hidden');
    
    const loading = document.getElementById('system-loading');
    const noteCard = document.getElementById('shadow-note-card');
    const list = document.getElementById('note-points');

    loading.classList.remove('hidden');
    noteCard.classList.add('hidden');

    const url = localStorage.getItem('mission_url') || document.getElementById('yt-url').value;
    
    let topic = "General Coding Concept";
    if(isManual) topic = document.getElementById('manual-text').value.substring(0, 200);

    try {
        const res = await fetch('/generate-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: url, topic: topic })
        });

        const data = await res.json();
        currentNoteData = data; 

        document.getElementById('note-title').innerText = data.title || "Extracted Intel";
        
        list.innerHTML = `<p style="color:#aaa; font-style:italic; margin-bottom:15px; border-left:3px solid var(--neon-purple); padding-left:10px;">${data.summary}</p>`;
        
        if(data.sections) {
            data.sections.forEach(sec => {
                list.innerHTML += `
                    <div style="margin-bottom:15px;">
                        <strong style="color:var(--neon-blue); display:block; margin-bottom:5px;">${sec.heading}</strong>
                        <div style="color:#ddd; font-size:0.95rem; background:rgba(255,255,255,0.05); padding:10px; border-radius:5px;">${sec.content}</div>
                    </div>
                `;
            });
        }

        if (data.keyTakeaways) {
            list.innerHTML += `<div style="border-top:1px dashed #444; padding-top:10px; margin-top:10px;"><strong style="color:var(--neon-gold)">⚡ KEY INTEL:</strong></div>`;
            data.keyTakeaways.forEach(pt => {
                list.innerHTML += `<li style="color:#ccc; margin-top:5px; margin-left:15px;">${pt}</li>`;
            });
        }

        loading.classList.add('hidden');
        noteCard.classList.remove('hidden');
        
        const saveBtn = document.getElementById('save-note-btn');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> SAVE';
        saveBtn.classList.remove('saved');

    } catch (err) {
        loading.innerHTML = `<span style='color:red'>ERROR: ${err.message}</span>`;
        console.error(err);
    }
}

function saveCurrentNote() {
    if(!currentNoteData) return alert("No note to save!");

    let grimoire = JSON.parse(localStorage.getItem('saved_notes')) || [];
    
    const exists = grimoire.find(n => n.title === currentNoteData.title);
    if(exists) {
        alert("Note already in Grimoire!");
        return;
    }

    const newNote = {
        id: Date.now(),
        title: currentNoteData.title,
        date: new Date().toLocaleDateString(),
        data: currentNoteData
    };

    grimoire.unshift(newNote); 
    localStorage.setItem('saved_notes', JSON.stringify(grimoire));

    const btn = document.getElementById('save-note-btn');
    btn.innerHTML = '<i class="fas fa-check"></i> SAVED';
    btn.classList.add('saved');
    
    if(window.audioSys) audioSys.play('success');
}

function openGrimoire() {
    const modal = document.getElementById('grimoire-overlay');
    const container = document.getElementById('grimoire-list');
    const grimoire = JSON.parse(localStorage.getItem('saved_notes')) || [];

    container.innerHTML = "";

    if(grimoire.length === 0) {
        container.innerHTML = "<div style='padding:20px; text-align:center; color:#777;'>GRIMOIRE IS EMPTY.</div>";
    }

    grimoire.forEach((note, index) => {
        container.innerHTML += `
            <div class="saved-note-card">
                <div style="display:flex; justify-content:space-between;">
                    <h4 style="margin:0; color:var(--neon-blue);">${note.title}</h4>
                    <small style="color:#555;">${note.date}</small>
                </div>
                <div style="margin-top:10px;">
                    <button class="action-mini-btn" onclick="loadSavedNote(${index})">READ</button>
                    <button class="action-mini-btn delete" onclick="deleteNote(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function loadSavedNote(index) {
    const grimoire = JSON.parse(localStorage.getItem('saved_notes'));
    const note = grimoire[index].data;
    
    document.getElementById('grimoire-overlay').style.display = 'none';
    
    document.getElementById('note-title').innerText = note.title;
    const list = document.getElementById('note-points');
    list.innerHTML = `<p style="color:#aaa; font-style:italic;">${note.summary}</p>`;
    
    note.sections.forEach(sec => {
        list.innerHTML += `<div><strong style="color:var(--neon-blue)">${sec.heading}</strong><br>${sec.content}</div><br>`;
    });
    
    document.getElementById('shadow-note-card').classList.remove('hidden');
    document.getElementById('save-note-btn').style.display = 'none'; 
}

function deleteNote(index) {
    let grimoire = JSON.parse(localStorage.getItem('saved_notes'));
    grimoire.splice(index, 1);
    localStorage.setItem('saved_notes', JSON.stringify(grimoire));
    openGrimoire(); 
}

// =============================================================
// 🔥 2. QUEST SYSTEM (FULL CODE) 🔥
// =============================================================

async function fetchProjects() {
    document.getElementById('shadow-note-card').classList.add('hidden');
    document.getElementById('system-loading').classList.add('hidden');
    const list = document.getElementById('project-list');
    list.innerHTML = '';
    
    const loading = document.getElementById('project-loading');
    loading.classList.remove('hidden');

    const url = localStorage.getItem('mission_url') || document.getElementById('yt-url').value;
    let topic = "";

    if (isManual) {
        topic = "Summary: " + document.getElementById('manual-text').value.substring(0, 150);
    } else {
        const title = await getVideoTitle(url);
        topic = `Create 3 coding projects related to: "${title}"`;
    }

    try {
        const res = await fetch('/generate-projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topic })
        });

        const projects = await res.json();
        currentGeneratedProjects = projects; 

        loading.classList.add('hidden');
        renderProjects(projects);

    } catch (err) {
        console.error("Project Error:", err);
        loading.innerHTML = `<span style='color:var(--neon-red)'>SYSTEM FAILURE. RETRY.</span>`;
    }
}

function renderProjects(projects) {
    const list = document.getElementById('project-list');
    list.innerHTML = '';

    projects.forEach((p, index) => {
        let rankClass = 'rank-E';
        if (p.rank === 'B-RANK') rankClass = 'rank-B';
        if (p.rank === 'S-RANK') rankClass = 'rank-S';

        const html = `
            <div class="quest-card">
                <div class="quest-rank ${rankClass}">${p.rank}</div>
                <div class="quest-title">${p.title}</div>
                <div class="quest-desc">${p.desc}</div>
                <div style="margin: 10px 0; font-size: 0.8rem; color:#aaa;">
                    <i class="fas fa-microchip"></i> SKILLS: ${p.requiredSkills ? p.requiredSkills.join(', ') : 'General'}
                </div>
                
                <button id="btn-quest-${index}" class="accept-btn" onclick="acceptQuest(${index})">
                    <i class="fas fa-plus"></i> ACCEPT QUEST
                </button>
            </div>
        `;
        list.innerHTML += html;
    });
}

function acceptQuest(index) {
    const quest = currentGeneratedProjects[index];
    const btn = document.getElementById(`btn-quest-${index}`);

    let myQuests = JSON.parse(localStorage.getItem('active_quests')) || [];

    if(myQuests.find(q => q.title === quest.title)) {
        alert("Quest already active!");
        return;
    }

    quest.status = "active";
    quest.date = new Date().toLocaleDateString();
    myQuests.push(quest);
    localStorage.setItem('active_quests', JSON.stringify(myQuests));

    btn.innerText = "IN PROGRESS...";
    btn.style.background = "#333";
    btn.style.color = "#ffff00";
    btn.style.border = "1px solid #ffff00";
    btn.disabled = true;

    if(window.audioSys) audioSys.play('success');
    alert(`QUEST ACCEPTED: ${quest.title}\nCheck 'Active Contracts' on Game Map or Dashboard.`);
}

// --- SUMMON & SCANNER ---
async function summonShadow() {
    const overlay = document.getElementById('summon-overlay');
    if (window.audioSys) audioSys.play('success');
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';

    setTimeout(() => {
        window.open('shadow-tutor.html', 'ShadowTutor', 'width=400,height=600,right=20,bottom=20');
        overlay.style.display = 'none';
    }, 3000);
}

let searchTimeout;
async function scanGateKey() {
    const url = document.getElementById('yt-url').value;
    const statusDiv = document.getElementById('scan-status');
    const previewDiv = document.getElementById('gate-preview');
    const btn = document.getElementById('open-gate-btn');

    statusDiv.classList.add('hidden');
    previewDiv.classList.add('hidden');
    if (btn) btn.classList.add('disabled');

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) return;

    statusDiv.classList.remove('hidden');
    statusDiv.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> SCANNING GATE KEY...';

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`https://noembed.com/embed?url=${url}`);
            const data = await res.json();
            if (data.error) throw new Error("Invalid Key");

            statusDiv.classList.add('hidden');
            previewDiv.classList.remove('hidden');
            document.getElementById('prev-img').src = data.thumbnail_url;
            document.getElementById('prev-title').innerText = data.title;
            document.getElementById('prev-channel').innerText = "AUTHOR: " + data.author_name.toUpperCase();

            if (btn) {
                btn.classList.remove('disabled');
                btn.innerHTML = '<i class="fas fa-door-open"></i> ENTER DUNGEON';
            }
            if (window.audioSys) audioSys.play('hover');

        } catch (err) {
            statusDiv.innerHTML = '<span style="color:red"><i class="fas fa-times"></i> CORRUPTED GATE KEY</span>';
        }
    }, 800);
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('yt-url').value = text;
        scanGateKey();
    } catch (err) {
        alert("Permission denied!");
    }
}

// --- EXIT & TOGGLES ---
function exitDungeon() {
    document.body.style.overflow = 'auto';
    window.location.href = 'game-map.html';
}

// 🔥 RETREAT LOGIC (Anti-Cheat Warning)
function returnToLobby() {
    if (sessionXP > 0) {
        if(confirm(`⚠️ WARNING: GATE CLOSING!\n\nYou have ${sessionXP} Unsaved XP.\nLeaving now will destroy these rewards.\n\nRetreat anyway?`)) {
            window.location.href = 'game-map.html';
        }
    } else {
        window.location.href = 'game-map.html';
    }
}

// --- QUIZ TOGGLE ---
let isQuizSystemOnline = true; 
function toggleQuizSystem() {
    isQuizSystemOnline = !isQuizSystemOnline;
    const btn = document.getElementById('quiz-toggle-btn');
    if(isQuizSystemOnline) {
        btn.innerHTML = '<i class="fas fa-shield-alt"></i> QUIZ: ON';
        btn.style.borderColor = "var(--neon-gold)";
        btn.style.color = "var(--neon-gold)";
        btn.style.background = "rgba(255, 215, 0, 0.1)";
        if(window.audioSys) audioSys.play('click');
    } else {
        btn.innerHTML = '<i class="fas fa-user-secret"></i> QUIZ: OFF';
        btn.style.borderColor = "#555";
        btn.style.color = "#777";
        btn.style.background = "rgba(0,0,0,0.5)";
        if(window.audioSys) audioSys.play('click');
    }
}

// =============================================================
// 🔥 DYNAMIC REWARD SYSTEM (SESSION XP & DISPLAY FIX) 🔥
// =============================================================

const REWARD_DATABASE = {
    'kings': [ 'assets/videos/kings_1.mp4', 'assets/videos/kings_2.mp4', 'assets/videos/kings_3.mp4' ],
    'recovery': [ 'assets/videos/recovery_1.mp4', 'assets/videos/recovery_2.mp4', 'assets/videos/recovery_3.mp4' ]
};

function claimReward() {
    // 1. Hide Gift Overlay
    const giftOverlay = document.getElementById('gift-overlay');
    giftOverlay.classList.add('hidden');
    giftOverlay.style.display = 'none';
    
    // 2. 🔥 ADD TO SESSION XP (NOT LOCALSTORAGE)
    sessionXP += 50;
    console.log(`System: +50 XP Added to Buffer (Total: ${sessionXP})`);

    // 3. Select Video
    const userPref = localStorage.getItem('hunterRewardType') || 'kings';
    const videoList = REWARD_DATABASE[userPref] || REWARD_DATABASE['kings'];
    const randomIndex = Math.floor(Math.random() * videoList.length);
    const selectedVideo = videoList[randomIndex];

    // 4. Play Video
    const videoEl = document.getElementById('reward-video');
    const sourceEl = videoEl.querySelector('source');
    if (sourceEl) sourceEl.src = selectedVideo; else videoEl.src = selectedVideo;

    videoEl.load();
    const rewardOverlay = document.getElementById('reward-overlay');
    rewardOverlay.classList.remove('hidden');
    rewardOverlay.style.display = 'block'; // Force visibility
    
    if (window.audioSys && window.audioSys.sounds.bgm) audioSys.sounds.bgm.pause();
    videoEl.play().catch(e => console.log("Audio permission needed:", e));
    videoEl.onended = function() { closeReward(); };
}

function closeReward() {
    const videoEl = document.getElementById('reward-video');
    videoEl.pause();
    videoEl.currentTime = 0;
    
    const rewardOverlay = document.getElementById('reward-overlay');
    rewardOverlay.classList.add('hidden');
    rewardOverlay.style.display = 'none';
    document.getElementById('gift-overlay').style.display = 'none';

    resumeVideo();
}

// 🔥 FINISH DUNGEON (COMMIT SESSION XP)
function finishDungeon() {
    // Extra Check: Video khatam hua ya nahi?
    if (!isDungeonCleared) {
        alert("⚠️ DUNGEON BOSS IS STILL ALIVE! (Finish the video first)");
        return;
    }

    const overlay = document.getElementById('clear-overlay');
    const rankEl = document.getElementById('final-rank');

    let accuracy = quizData.length > 0 ? Math.round((correctAnswers / quizData.length) * 100) : 100;
    if (quizData.length === 0 && correctAnswers === 0) accuracy = 50; 

    // Rank Calculation
    let rank = 'E';
    let rankXP = 100;

    if (accuracy >= 90) { rank = 'S'; rankXP = 1000; rankEl.className = 'rank-stamp rank-s'; }
    else if (accuracy >= 75) { rank = 'A'; rankXP = 700; rankEl.className = 'rank-stamp rank-a'; }
    else if (accuracy >= 50) { rank = 'B'; rankXP = 400; rankEl.className = 'rank-stamp rank-b'; }
    else if (accuracy >= 30) { rank = 'C'; rankXP = 200; rankEl.className = 'rank-stamp rank-c'; }
    else { rank = 'E'; rankXP = 50; rankEl.className = 'rank-stamp rank-e'; }

   

    // 🔥 SAVE EVERYTHING NOW (Session + Rank XP)
    let totalEarned = sessionXP + rankXP;
    
    // 1. Local Save (Backup)
    let currentPending = parseInt(localStorage.getItem('add_xp') || "0");
    localStorage.setItem('add_xp', currentPending + totalEarned);

    // 2. 🔥 CLOUD SAVE (Database)
    // Ye function data ko Firebase bhej dega
    syncXPToCloud(totalEarned); 

    document.getElementById('final-accuracy').innerText = accuracy + "%";
// ... baki code same ...
    document.getElementById('final-xp').innerText = "+" + totalEarned + " XP";
    rankEl.innerText = rank;

    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (window.audioSys) audioSys.play('levelUp');
    }
}