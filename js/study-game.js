// FORCE CLEAN LOAD
if (performance.navigation.type !== 1) {
    // window.location.reload(true);
}
// =============================================================
// 🔥 SMART CONFIG: LOCALHOST vs RENDER (AUTO SWITCH)
// =============================================================

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'                          // 🏠 Jab khud ke PC par ho
    : 'https://hunter-academy-1.onrender.com';         // ☁️ Jab Internet par (Render) par ho

console.log(`📡 System Connected to: ${API_BASE_URL}`);

// --- STATE VARIABLES ---
let player;
let timingsCalculated = false; 
let checkInterval;
let quizTimestamps = []; // 🔥 FIX: Ye missing tha
let lastQuizTime = 0;    // 🔥 FIX: Ye bhi missing tha

function destroyYouTubePlayer() {
    try {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }

        if (player && typeof player.destroy === "function") {
            player.destroy();
            player = null;
            console.log("🧨 YouTube Player Destroyed Properly");
        }
    } catch (e) {
        console.warn("YT destroy error:", e);
    }
}

let quizData = [];
let summaryData = [];
let nextTriggerTime = 0;
let currentQIndex = 0;
let isQuizActive = false;
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
window.addEventListener('load', function() {
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
});

// --- HELPER: FORMAT AI TEXT (DIAGRAMS) ---
function formatAIContent(text) {
    if (!text) return "";

    // Remove **** markers
    let formattedText = text.replace(/\*\*\*\*(.*?)\*\*\*\*/g, '');

    // Remove bold hints like **waveform**, **diagram**, **circuit**
    formattedText = formattedText.replace(/\*\*(.*?waveform.*?)\*\*/gi, '');
    formattedText = formattedText.replace(/\*\*(.*?diagram.*?)\*\*/gi, '');
    formattedText = formattedText.replace(/\*\*(.*?circuit.*?)\*\*/gi, '');

    // Match: [Image of X]
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

// --- INIT DUNGEON (QUIZ MODE) ---
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
        const res = await fetch(`${API_BASE_URL}/generate-dungeon`, {
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

        // Check Quiz Data
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

        // 🔥 VIDEO LOAD LOGIC
        const videoId = extractVideoID(url);
        loadVideo(videoId);

        // 🔥 FIX 404 IMAGES
        setTimeout(() => {
            const allImages = document.querySelectorAll('img');
            allImages.forEach(img => {
                img.onerror = function() {
                    this.style.display = 'none'; 
                    const fallbackDiv = document.createElement('div');
                    fallbackDiv.innerHTML = `
                        <div style="border:1px dashed red; padding:10px; text-align:center; margin:10px 0;">
                            <i class="fas fa-exclamation-triangle" style="color:red;"></i>
                            <div style="font-size:0.8rem; color:#aaa;">DIAGRAM MISSING</div>
                        </div>`;
                    this.parentNode.insertBefore(fallbackDiv, this);
                };
            });
        }, 3000);

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
    if (window.audioSys) audioSys.startBGM();
    console.log("Player Ready. Waiting for playback to calculate AI timings...");
}

// --- PLAYER STATE CHANGE ---
function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        
        // 🔥 FIX: Calculate Timings ONLY when video starts playing (Non-Zero Duration)
        if (!timingsCalculated) {
            calculateQuizTimings();
            timingsCalculated = true;
        }

        checkInterval = setInterval(checkTime, 1000);
    } else {
        clearInterval(checkInterval);
    }

    if (event.data == YT.PlayerState.ENDED) {
        unlockDungeonCompletion();
    }
}

// 🔥 ULTIMATE SMART QUIZ SCHEDULER
function calculateQuizTimings() {
    const duration = player.getDuration();
    const totalQuestions = quizData.length;

    // Reset timeline
    quizTimestamps = [];

    if (duration > 0 && totalQuestions > 0) {
        // 1. Edge safety buffer (start + end)
        const buffer = 30;
        const playableDuration = duration - (buffer * 2);
        if (playableDuration <= 0) return;

        // 2. Smart Count: Even if AI gave 8, we use only 1–3 max (based on video length)
        let maxQuizAllowed = 3;
        if (duration < 240) maxQuizAllowed = 1;         // < 4 mins
        else if (duration < 600) maxQuizAllowed = 2;    // < 10 mins
        else maxQuizAllowed = 3;                        // longer videos

        const finalQuizCount = Math.min(totalQuestions, maxQuizAllowed);

        // 3. Interval logic
        const interval = playableDuration / (finalQuizCount + 1);

        for (let i = 1; i <= finalQuizCount; i++) {
            let time = buffer + Math.floor(interval * i);

            // Minor randomness to avoid rigidness
            const variance = Math.floor(Math.random() * 8) - 4;  // ±4 sec
            time = Math.max(buffer, Math.min(time + variance, duration - buffer));

            quizTimestamps.push(time);
        }
    }

    console.log("🎯 FINAL TIMINGS:", quizTimestamps.map(t => `${Math.floor(t / 60)}m ${t % 60}s`));
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

        // Safety: Start ke 10 sec me kuch mat karo
        if (currentTime < 10) return; 

        // 🔥 COOLDOWN CHECK: 
        // Agar pichla quiz 30 second pehle hi khatam hua hai, to abhi ruk jao
        // Bhale hi timestamp match ho raha ho.
        if ((currentTime - lastQuizTime) < 30 && lastQuizTime !== 0) return;

        if (quizData.length > 0 && 
            currentQIndex < quizTimestamps.length && 
            currentTime >= quizTimestamps[currentQIndex]) {

            // Double Check: Kya humne ye sawal pehle hi dikha diya?
            // (CurrentQIndex handle karega, bas timestamp verify karo)
            
            console.log(`⚡ Triggering Quiz #${currentQIndex + 1} at ${Math.floor(currentTime)}s`);
            triggerQuiz(quizData[currentQIndex]);
            
            // Last triggered time update karo
            lastQuizTime = currentTime;
        }
    }
}
// --- QUIZ LOGIC ---
function triggerQuiz(question) {
    isQuizActive = true;
    if (player && typeof player.pauseVideo === "function") player.pauseVideo();
    if (window.audioSys) audioSys.play('success');

    const overlay = document.getElementById('quiz-overlay');
    overlay.classList.add('active');
    overlay.style.display = 'flex';

    document.getElementById('q-text').innerText = question.question;
    const optDiv = document.getElementById('q-options');
    
    // 🔥 CRITICAL FIX: Remove 'locked' class so new buttons are clickable
    optDiv.classList.remove('locked'); 
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
    const parent = document.getElementById('q-options');
    
    // Check if the container is already locked
    if (parent.classList.contains('locked')) return;
    
    // Lock the container immediately to prevent multiple clicks
    parent.classList.add('locked');

    totalAnswered++;

    if (selected === correct) {
        correctAnswers++;
        btn.classList.add('correct');
        if (window.audioSys) audioSys.play('success');
        
        // Slight delay before showing gift
        setTimeout(() => { showGift(); }, 800);
    } else {
        btn.classList.add('wrong');
        if (window.audioSys) audioSys.play('fail');
        
        // Show the correct answer automatically for learning
        const allBtns = parent.querySelectorAll('.opt-btn');
        if (allBtns[correct]) allBtns[correct].classList.add('correct');

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
    
    // Set Cooldown Timestamp
    if(player && player.getCurrentTime) {
        lastQuizTime = player.getCurrentTime(); 
    }

    currentQIndex++; // Move to next
    player.playVideo();
    if (window.audioSys) audioSys.startBGM();
}

window.extractNotes = async function() {
    document.getElementById('project-list').innerHTML = '';
    document.getElementById('project-loading').classList.add('hidden');

    const loading = document.getElementById('system-loading');
    const noteCard = document.getElementById('shadow-note-card');
    const list = document.getElementById('note-points');

    loading.classList.remove('hidden');
    noteCard.classList.add('hidden');
    
    // 🛑 Stop any previous audio if playing
    if(window.speechSynthesis) window.speechSynthesis.cancel();

    const url = localStorage.getItem('mission_url') || document.getElementById('yt-url').value;
    let topic = "General Coding Concept";
    if(isManual) topic = document.getElementById('manual-text').value.substring(0, 200);

    try {
        const res = await fetch(`${API_BASE_URL}/generate-notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: url, topic: topic })
        });

        const data = await res.json();
        currentNoteData = data;

        // --- 🎧 PREPARE AUDIO TEXT (Clean Text for AI Voice) ---
        let fullAudioText = `Here is your summary. ${data.summary}. `;
        if(data.sections) {
            data.sections.forEach(sec => {
                fullAudioText += `Topic: ${sec.heading}. ${sec.content}. `;
            });
        }
        // Remove special chars like *, #, brackets for smooth speaking
        fullAudioText = fullAudioText.replace(/[*#\[\]]/g, '').replace(/["']/g, ""); 
        // -------------------------------------------------------

        document.getElementById('note-title').innerText = data.title || "Extracted Intel";

        // 🔥 MODIFIED HEADER WITH AUDIO BUTTON
        list.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px; gap: 10px;">
                <p style="color:#aaa; font-style:italic; margin:0; flex:1; border-left:3px solid var(--neon-purple); padding-left:10px;">
                    ${formatAIContent(data.summary)}
                </p>
                
                <button id="audio-btn" onclick="toggleNoteAudio('${fullAudioText}')" 
                    style="background:var(--neon-purple); border:none; color:white; padding:8px 15px; border-radius:20px; cursor:pointer; font-size:0.75rem; white-space:nowrap; display:flex; align-items:center; gap:5px; box-shadow: 0 0 10px rgba(189, 0, 255, 0.3);">
                    <i class="fas fa-headphones"></i> LISTEN
                </button>
            </div>
        `;

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
// ==========================================
// 🎧 AUDIO SYSTEM LOGIC (NotebookLM Style)
// ==========================================
let isSpeaking = false;

window.toggleNoteAudio = function(text) {
    const btn = document.getElementById('audio-btn');

    if (isSpeaking) {
        // Stop Audio
        window.speechSynthesis.cancel();
        isSpeaking = false;
        if(btn) {
            btn.innerHTML = '<i class="fas fa-headphones"></i> LISTEN';
            btn.style.background = "var(--neon-purple)";
            btn.classList.remove('pulse'); // Remove animation
        }
    } else {
        // Start Audio
        window.speechSynthesis.cancel(); // Safety clear
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Voice Selection: Try to find "Google US English" or "Female"
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Female"));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.rate = 1.0; 
        utterance.pitch = 1.0;

        // When audio finishes naturally
        utterance.onend = function() {
            isSpeaking = false;
            if(btn) {
                btn.innerHTML = '<i class="fas fa-headphones"></i> LISTEN';
                btn.style.background = "var(--neon-purple)";
                btn.classList.remove('pulse');
            }
        };

        window.speechSynthesis.speak(utterance);
        isSpeaking = true;
        
        if(btn) {
            btn.innerHTML = '<i class="fas fa-stop"></i> STOP';
            btn.style.background = "var(--neon-red)";
            btn.classList.add('pulse'); // Add simple animation
        }
    }
};

// Chrome Bug Fix: Load voices immediately
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
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
        const res = await fetch(`${API_BASE_URL}/generate-projects`, {
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
    }, 3001);
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

    // 2. Cloud Save (Safe Check)
    if (typeof window.syncXPToCloud === "function") {
        window.syncXPToCloud(totalEarned);
    } else {
        console.log("⚠️ Database not connected. XP saved locally only.");
    }
   

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

// 1. Join Friend Guild
window.joinFriendGuild = function() {
    const codeInput = document.getElementById('friend-code-input');
    const code = codeInput.value.trim();

    if (!code) {
        alert("Please paste a valid invite code!");
        return;
    }

    console.log("Joining guild with code:", code);
    alert(`Attempting to join guild: ${code}\n(Backend logic required here)`);

    codeInput.value = "";
}

// 2. Go Back Function
window.goBackFromGuild = function() {
    closeModal('guild-modal');
}

// --- HELPER: CLOSE MODAL ---
window.closeModal = function(modalId) {
    const el = document.getElementById(modalId);
    if(el) el.classList.add('hidden');
}

// =============================================================
// 🔥 ACTIVATES THE VISUAL GAME (RUNE LINK / OWL) - FIXED
// =============================================================
window.activateRuneMode = async function(retryCount = 0) { // Step 1: Add retry counter

    // 1. Player Pause
    if (typeof player !== "undefined" && player && typeof player.pauseVideo === "function") {
        player.pauseVideo();
    }

    // UI: Button Loading State
    const btn = document.getElementById('runeBtn') || document.querySelector('button[onclick="activateRuneMode()"]');
    if(btn) {
        if(!btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> SYNCING... (${retryCount + 1})`;
        btn.style.pointerEvents = "none";
    }

    // 🔥 STEP 2: LOOP PROTECTION (Stop after 3 retries)
    if (retryCount > 3) {
        console.error("⛔ Recursion Limit Reached: No new games found.");
        if(btn) {
            btn.innerHTML = btn.dataset.originalText;
            btn.style.pointerEvents = "auto";
        }
        alert("⚠️ SYSTEM OVERLOAD: No alternative simulations found for this topic right now.\n\nThe Architect suggests trying a different video or clearing your blacklist.");
        return;
    }

    try {
        const input = document.getElementById('yt-url');
        const url = (input && input.value) || localStorage.getItem('mission_url');

        if(!url) {
            alert("No Video URL Found!");
            return;
        }

        console.log(`📡 Calling OWL Agent (Attempt ${retryCount + 1})...`);

        const response = await fetch(`${API_BASE_URL}/api/process-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: url })
        });

        if (!response.ok) throw new Error("Server Connection Failed");

        const result = await response.json();
        console.log("🟢 OWL Response:", result);

        let gameData = null;
        if (result.type === 'FOUND' || result.type === 'GENERATED') {
            gameData = result.data;

            // 🔥 STEP 3: SMART BLACKLIST CHECK
            const blacklist = JSON.parse(localStorage.getItem('banned_games')) || [];
            
            if (gameData.url && blacklist.includes(gameData.url)) {
                console.warn(`⚠️ Attempt ${retryCount + 1}: Retrieved banned game. Rerolling...`);
                
                // Recursive call with incremented counter
                return activateRuneMode(retryCount + 1); 
            }
        }

        // 4. Game Launch Logic
        if (gameData) {
            console.log(`🎯 GAME READY: ${gameData.name || gameData.gameTitle}`);

            // CASE A: External Game -> SHOW CUSTOM POPUP
            if (gameData.url && (!gameData.pairs || gameData.pairs.length === 0)) {
                
                if (gameData.url.includes("game-lab.html")) {
                    window.location.href = gameData.url;
                } else {
                    showGameLaunchModal(gameData);
                }
            }
            // CASE B: Internal Game
            else {
                const unifiedData = {
                    title: gameData.gameTitle || gameData.name || "Unknown Topic",
                    pairs: gameData.pairs || [],
                    theme: "cyber"
                };
                localStorage.setItem("currentRuneLevel", JSON.stringify(unifiedData));
                window.location.href = "game-lab.html";
            }

        } else {
            alert("⚠️ OWL could not generate a game for this video. Try another topic.");
        }

    } catch (err) {
        console.error("Master Agent Failure:", err);
        alert(`Connection Failed: ${err.message}`);
    } finally {
        // Reset button only if we are NOT rerolling (recursion handles its own state)
        if(btn && retryCount === 0 && !document.querySelector('.match-score')){ 
             // Note: If modal opens, we keep loading state until user action, 
             // but here we just reset for safety if not recursing.
             if(!document.getElementById('custom-launch-modal')) {
                 btn.innerHTML = btn.dataset.originalText;
                 btn.style.pointerEvents = "auto";
             }
        }
    }
};
// =============================================================
// 🔥 UPDATED: GAME LAUNCHER WITH REROLL SYSTEM
// =============================================================

function showGameLaunchModal(gameData) {
    // 1. Cleanup Old Modal
    const oldModal = document.getElementById('custom-launch-modal');
    if(oldModal) oldModal.remove();

    // 2. Generate Random "Match Score" (Just for Immersion)
    const matchScore = Math.floor(Math.random() * (99 - 75) + 75); 

    // 3. Create Overlay
    const modalDiv = document.createElement('div');
    modalDiv.id = 'custom-launch-modal';

    // 4. Modal HTML (With Reroll & Feedback)
    modalDiv.innerHTML = `
        <div>
            <div class="match-score">COMPATIBILITY: ${matchScore}%</div>
            
            <i class="fas fa-rocket" style="font-size: 3rem; color: #ffd700; margin-bottom: 20px;"></i>
            
            <h2 style="color: #fff; margin: 0 0 10px 0; font-family: 'Orbitron', sans-serif;">GAME FOUND!</h2>
            <p style="color: #00eaff; font-size: 1.1rem; margin-bottom: 5px;">${gameData.name || "Unknown Game"}</p>
            <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 5px;">The System has retrieved a training simulation.</p>

            <div id="feedback-options">
                <p style="color:var(--neon-red); font-size:0.8rem;">REASON FOR REROLL?</p>
                <div style="display:flex; gap:5px; justify-content:center;">
                    <button class="feedback-chip" onclick="handleRejection('${gameData.url}', 'boring')">Too Boring</button>
                    <button class="feedback-chip" onclick="handleRejection('${gameData.url}', 'irrelevant')">Irrelevant</button>
                    <button class="feedback-chip" onclick="handleRejection('${gameData.url}', 'broken')">Broken Link</button>
                </div>
            </div>

            <div class="modal-actions" id="main-actions">
                <button id="reroll-btn" onclick="showFeedbackUI()">
                    <i class="fas fa-sync-alt"></i> REROLL
                </button>
                
                <button id="launch-btn-now" style="
                    background: linear-gradient(45deg, #00eaff, #0077ff); border: none; 
                    padding: 12px 30px; color: #000; font-weight: bold; border-radius: 5px; 
                    cursor: pointer; font-size: 1rem; transition: transform 0.2s;">
                    🚀 LAUNCH
                </button>
            </div>
            
            <br>
            <button id="cancel-launch-btn" style="background:none; border:none; color:#555; cursor:pointer; text-decoration:underline;">Cancel</button>
        </div>
    `;

    document.body.appendChild(modalDiv);

    // --- EVENT LISTENERS ---

    // Launch
    document.getElementById('launch-btn-now').onclick = function() {
        window.open(gameData.url, '_blank');
        modalDiv.remove();
        // Optional: Save as "Liked" internally if needed
    };

    // Cancel
    document.getElementById('cancel-launch-btn').onclick = function() {
        modalDiv.remove();
    };
}

// --- UI LOGIC: Show Feedback Options ---
window.showFeedbackUI = function() {
    document.getElementById('main-actions').style.display = 'none'; // Hide buttons
    document.getElementById('feedback-options').style.display = 'flex'; // Show reasons
}

// --- LOGIC: Handle Rejection & Reroll ---
window.handleRejection = function(gameUrl, reason) {
    console.log(`❌ Game Rejected: ${reason}`);

    // 1. Save to Blacklist (Local Storage)
    let blacklist = JSON.parse(localStorage.getItem('banned_games')) || [];
    blacklist.push(gameUrl);
    localStorage.setItem('banned_games', JSON.stringify(blacklist));

    // 2. Close Modal
    const oldModal = document.getElementById('custom-launch-modal');
    if(oldModal) oldModal.remove();

    // 3. Trigger Reroll (Call Agent Again)
    // Delay to make it feel like "Processing"
    const btn = document.getElementById('runeBtn');
    if(btn) btn.innerHTML = `<i class="fas fa-cog fa-spin"></i> ADAPTING...`;

    setTimeout(() => {
        activateRuneMode(); // Call the main function again to fetch a NEW game
    }, 1000);
}