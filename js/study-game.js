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
let isQuizSystemOnline = true; 

// Session State
let sessionXP = 0; 
let isDungeonCleared = false; 

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
            setTimeout(() => {
                if (typeof scanGateKey === 'function') scanGateKey();
            }, 500);
        }
    }
};

// --- HELPER: FORMAT AI TEXT (DIAGRAMS) ---
function formatAIContent(text) {
    if (!text) return "";

    // 1️⃣ Convert **** text **** → [Image of text]
    let formattedText = text.replace(
        /\*\*\*\*(.*?)\*\*\*\*/g,
        '[Image of $1]'
    );

    // 2️⃣ Remove bold visual hints (**waveform**, **diagram**, **circuit**)
    formattedText = formattedText.replace(/\*\*(.*? waveform.*?)\*\*/gi, '');
    formattedText = formattedText.replace(/\*\*(.*? diagram.*?)\*\*/gi, '');
    formattedText = formattedText.replace(/\*\*(.*? circuit.*?)\*\*/gi, '');

    // 3️⃣ Match [Image of X] correctly
    const regex = /\[Image of (.*?)\]/g;

    return formattedText.replace(regex, function (_, query) {
        const cleanQuery = query.replace(/[:.]/g, "").trim();

        return `
        <div class="diagram-placeholder"
             style="margin:10px 0; padding:15px;
             border:1px dashed var(--neon-blue);
             background:rgba(0,234,255,0.05);
             border-radius:8px; text-align:center;">

            <i class="fas fa-image"
               style="font-size:1.5rem; color:var(--neon-blue);"></i>

            <div style="color:#aaa; font-size:0.8rem;">
                VISUALIZATION REQUESTED
            </div>

            <strong style="color:white;">${cleanQuery}</strong>
            <br>

            <a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(cleanQuery)}"
               target="_blank"
               style="color:var(--neon-gold);
               font-size:0.7rem; text-decoration:none;">
                [ CLICK TO VIEW REFERENCE ]
            </a>
        </div>`;
    });
}

    
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
window.toggleManual = function() {
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
window.initDungeon = async function() {
    const url = document.getElementById('yt-url').value;
    const text = document.getElementById('manual-text') ? document.getElementById('manual-text').value : "";

    if (!url && !isManual) return alert("PLEASE PASTE YOUTUBE URL (For Video Player)!");
    if (isManual && !text) return alert("PLEASE PASTE TRANSCRIPT TEXT (For AI)!");

    if (window.audioSys) audioSys.play('click');
    document.getElementById('input-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');

    try {
        const payload = isManual ? { transcriptText: text } : { videoUrl: url };

        // Server Request
        const res = await fetch('http://localhost:3001/generate-dungeon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Server Error");
        const rawText = await res.text();
        const data = JSON.parse(rawText);
        
        if (data.error) throw new Error(data.error);

        console.log("SERVER DATA RECEIVED:", data);

        quizData = data.questions || [];
        summaryData = data.summary || [];

        // Check if Quiz Data exists
        if (quizData.length === 0) {
            console.warn("⚠️ No Quiz Questions generated.");
            alert("System Message: AI could not generate questions. Using Video Only Mode.");
        } else {
            console.log(`✅ ${quizData.length} Questions Loaded!`);
        }

        if (summaryData) {
            const summaryLog = document.getElementById('summary-log');
            if (summaryLog) {
                const formattedSummary = summaryData.map(s => `> ${formatAIContent(s)}`).join('<br>');
                summaryLog.innerHTML = `<strong>MISSION OBJECTIVES:</strong><br> ${formattedSummary}`;
            }
        }

        const videoId = extractVideoID(url);
        loadVideo(videoId);

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
    if(!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

window.goFullScreen = function() {
    var elem = document.getElementById("master-container"); 
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
}

// --- YOUTUBE PLAYER CONFIG ---
function loadVideo(vidId) {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('game-screen').style.display = 'block';

    if (!window.YT) {
        setTimeout(() => loadVideo(vidId), 1000);
        return;
    }

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
            'onStateChange': onPlayerStateChange 
        }
    });
}

function onPlayerReady(event) {
    // 🔥 UPDATE: Timer set to 10 seconds for faster testing
    nextTriggerTime = 10; 
    currentQIndex = 0;
    if (window.audioSys) audioSys.startBGM();
    console.log("Player Ready. First Quiz set for: " + nextTriggerTime + "s");
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        checkInterval = setInterval(checkTime, 1000);
    } else {
        clearInterval(checkInterval);
    }

    if (event.data == YT.PlayerState.ENDED) {
        unlockDungeonCompletion();
    }
}

function unlockDungeonCompletion() {
    if (isDungeonCleared) return; 
    
    isDungeonCleared = true;
    console.log("DUNGEON CLEARED! UNLOCKING EXIT...");
    
    const btn = document.querySelector('.complete-btn');
    if (btn) {
        btn.classList.add('unlocked');
        if (window.audioSys) audioSys.play('success');
    }
}

function checkTime() {
    if (isQuizActive) return;
    if (!isQuizSystemOnline) return; 

    if(player && player.getCurrentTime) {
        const currentTime = player.getCurrentTime();
        
        // 🔥 UPDATE: Safe Check added here
        if (quizData && quizData.length > 0 && 
            currentTime >= nextTriggerTime && 
            currentQIndex < quizData.length) {
            
            console.log("Triggering Quiz #" + (currentQIndex + 1));
            triggerQuiz(quizData[currentQIndex]);
        }
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
    nextTriggerTime = player.getCurrentTime() + 60; 
    currentQIndex++;
    player.playVideo();
    if (window.audioSys) audioSys.startBGM();
}

// =============================================================
// 🔥 GRIMOIRE SYSTEM 🔥
// =============================================================

window.extractNotes = async function() {
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
        const res = await fetch('http://localhost:3001/generate-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: url, topic: topic })
        });

        const data = await res.json();
        currentNoteData = data; 

        document.getElementById('note-title').innerText = data.title || "Extracted Intel";
        
        list.innerHTML = `<p style="color:#aaa; font-style:italic; margin-bottom:15px; border-left:3px solid var(--neon-purple); padding-left:10px;">${formatAIContent(data.summary)}</p>`;
        
        if(data.sections) {
            data.sections.forEach(sec => {
                list.innerHTML += `
                    <div style="margin-bottom:15px;">
                        <strong style="color:var(--neon-blue); display:block; margin-bottom:5px;">${sec.heading}</strong>
                        <div style="color:#ddd; font-size:0.95rem; background:rgba(255,255,255,0.05); padding:10px; border-radius:5px;">
                            ${formatAIContent(sec.content)}
                        </div>
                    </div>
                `;
            });
        }

        if (data.keyTakeaways) {
            list.innerHTML += `<div style="border-top:1px dashed #444; padding-top:10px; margin-top:10px;"><strong style="color:var(--neon-gold)">⚡ KEY INTEL:</strong></div>`;
            data.keyTakeaways.forEach(pt => {
                list.innerHTML += `<li style="color:#ccc; margin-top:5px; margin-left:15px;">${formatAIContent(pt)}</li>`;
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

window.saveCurrentNote = function() {
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

window.openGrimoire = function() {
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

window.loadSavedNote = function(index) {
    const grimoire = JSON.parse(localStorage.getItem('saved_notes'));
    const note = grimoire[index].data;
    
    document.getElementById('grimoire-overlay').style.display = 'none';
    
    document.getElementById('note-title').innerText = note.title;
    const list = document.getElementById('note-points');
    list.innerHTML = `<p style="color:#aaa; font-style:italic;">${formatAIContent(note.summary)}</p>`;
    
    note.sections.forEach(sec => {
        list.innerHTML += `<div><strong style="color:var(--neon-blue)">${sec.heading}</strong><br>${formatAIContent(sec.content)}</div><br>`;
    });
    
    document.getElementById('shadow-note-card').classList.remove('hidden');
    document.getElementById('save-note-btn').style.display = 'none'; 
}

window.deleteNote = function(index) {
    let grimoire = JSON.parse(localStorage.getItem('saved_notes'));
    grimoire.splice(index, 1);
    localStorage.setItem('saved_notes', JSON.stringify(grimoire));
    openGrimoire(); 
}

// =============================================================
// 🔥 QUEST SYSTEM 🔥
// =============================================================

window.fetchProjects = async function() {
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
        const res = await fetch('http://localhost:3001/generate-projects', {
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

window.acceptQuest = function(index) {
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
window.summonShadow = async function() {
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
window.scanGateKey = async function() {
    const urlInput = document.getElementById('yt-url');
    const url = urlInput ? urlInput.value : "";
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

window.pasteFromClipboard = async function() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('yt-url').value = text;
        scanGateKey();
    } catch (err) {
        alert("Permission denied!");
    }
}

// --- EXIT & TOGGLES ---
window.exitDungeon = function() {
    document.body.style.overflow = 'auto';
    window.location.href = 'game-map.html';
}

window.returnToLobby = function() {
    if (sessionXP > 0) {
        if(confirm(`⚠️ WARNING: GATE CLOSING!\n\nYou have ${sessionXP} Unsaved XP.\nLeaving now will destroy these rewards.\n\nRetreat anyway?`)) {
            window.location.href = 'game-map.html';
        }
    } else {
        window.location.href = 'game-map.html';
    }
}

window.toggleQuizSystem = function() {
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
// 🔥 DYNAMIC REWARD SYSTEM 🔥
// =============================================================

const REWARD_DATABASE = {
    'kings': [ 'assets/videos/kings_1.mp4', 'assets/videos/kings_2.mp4', 'assets/videos/kings_3.mp4' , 'assets/videos/kings_4.mp4 ', 'assets/videos/kings_5.mp4' , 'assets/videos/kings_6.mp4' ],
    'recovery': [ 'assets/videos/recovery_1.mp4', 'assets/videos/recovery_2.mp4', 'assets/videos/recovery_3.mp4' , 'assets/videos/recovery_4.mp4' ]
};

window.claimReward = function() {
    const giftOverlay = document.getElementById('gift-overlay');
    giftOverlay.classList.add('hidden');
    giftOverlay.style.display = 'none';
    
    sessionXP += 50;
    console.log(`System: +50 XP Added to Buffer (Total: ${sessionXP})`);

    const userPref = localStorage.getItem('hunterRewardType') || 'kings';
    const videoList = REWARD_DATABASE[userPref] || REWARD_DATABASE['kings'];
    const randomIndex = Math.floor(Math.random() * videoList.length);
    const selectedVideo = videoList[randomIndex];

    const videoEl = document.getElementById('reward-video');
    const sourceEl = videoEl.querySelector('source');
    
    if (sourceEl) sourceEl.src = selectedVideo; 
    else videoEl.src = selectedVideo;

    videoEl.load();
    const rewardOverlay = document.getElementById('reward-overlay');
    rewardOverlay.classList.remove('hidden');
    rewardOverlay.style.display = 'block'; 
    
    if (window.audioSys && window.audioSys.sounds.bgm) audioSys.sounds.bgm.pause();
    videoEl.play().catch(e => console.log("Audio permission needed:", e));
    videoEl.onended = function() { closeReward(); };
}

window.closeReward = function() {
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
window.finishDungeon = function() {
    if (!isDungeonCleared) {
        alert("⚠️ DUNGEON BOSS IS STILL ALIVE! (Finish the video first)");
        return;
    }

    const overlay = document.getElementById('clear-overlay');
    const rankEl = document.getElementById('final-rank');

    let accuracy = quizData.length > 0 ? Math.round((correctAnswers / quizData.length) * 100) : 100;
    if (quizData.length === 0 && correctAnswers === 0) accuracy = 100;

    let rank = 'E';
    let rankXP = 100;

    if (accuracy >= 90) { rank = 'S'; rankXP = 1000; rankEl.className = 'rank-stamp rank-s'; }
    else if (accuracy >= 75) { rank = 'A'; rankXP = 700; rankEl.className = 'rank-stamp rank-a'; }
    else if (accuracy >= 50) { rank = 'B'; rankXP = 400; rankEl.className = 'rank-stamp rank-b'; }
    else if (accuracy >= 30) { rank = 'C'; rankXP = 200; rankEl.className = 'rank-stamp rank-c'; }
    else { rank = 'E'; rankXP = 50; rankEl.className = 'rank-stamp rank-e'; }

    // 🔥 SAVE EVERYTHING NOW
    let totalEarned = sessionXP + rankXP;
    
    // 1. Local Save
    let currentPending = parseInt(localStorage.getItem('add_xp') || "0");
    localStorage.setItem('add_xp', currentPending + totalEarned); 

    // 2. Cloud Save
    syncXPToCloud(totalEarned); 

    document.getElementById('final-accuracy').innerText = accuracy + "%";
    document.getElementById('final-xp').innerText = "+" + totalEarned + " XP";
    rankEl.innerText = rank;

    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (window.audioSys) audioSys.play('levelUp');
    }
}


// --- GUILD ACTIONS ---

// 1. दोस्त की गिल्ड जॉइन करने का फंक्शन
window.joinFriendGuild = function() {
    const codeInput = document.getElementById('friend-code-input');
    const code = codeInput.value.trim();

    if (!code) {
        alert("Please paste a valid invite code!");
        return;
    }

    // यहाँ पर वह लॉजिक आएगा जो सर्वर से चेक करेगा कि कोड सही है या नहीं।
    // अभी के लिए हम बस एक अलर्ट दिखा रहे हैं।
    console.log("Joining guild with code:", code);
    alert(`Attempting to join guild: ${code}\n(Backend logic required here)`);

    // सफल होने पर, इनपुट बॉक्स खाली करें
    codeInput.value = "";
}

// 2. वापस जाने (Back) का फंक्शन
window.goBackFromGuild = function() {
    // इस फंक्शन से आप तय कर सकते हैं कि "Back" बटन दबाने पर क्या होगा।
    // उदाहरण के लिए, यह मौजूदा पॉप-अप को बंद करके कोई पिछला मेनू खोल सकता है।
    // अभी के लिए, हम इसे सिर्फ बंद कर रहे हैं (CLOSE बटन जैसा)।
    closeModal('guild-modal');

    // अगर आपके पास कोई 'Main Menu' पॉप-अप है, तो आप उसे यहाँ खोल सकते हैं:
    // openModal('main-menu-modal');
}

// --- HELPER: CLOSE MODAL (अगर पहले से नहीं है) ---
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}