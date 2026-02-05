const API_BASE_URL = 'http://localhost:3001'; 
let sessionStartTime = new Date();
let comboCount = 0;
let tutorialStep = 0;

// ==========================================
// 1. DATA LOADING & INIT
// ==========================================
const savedGoal = localStorage.getItem('hunter_goal') || "Unknown Hunter";
const savedBlueprint = localStorage.getItem('hunter_blueprint');
const savedRoutine = localStorage.getItem('hunter_routine');

if (!savedBlueprint) {
    if(confirm("SYSTEM ALERT: No Blueprint Found. Initialize Architect?")) {
        window.location.href = 'study-os.html';
    }
}

const blueprint = JSON.parse(savedBlueprint);
document.getElementById('user-goal').innerText = savedGoal;
if(document.getElementById('total-weeks-display')) {
    document.getElementById('total-weeks-display').innerHTML = `<i class="fas fa-layer-group"></i> ${blueprint.roadmap.length}`;
}

// ==========================================
// 2. TUTORIAL SYSTEM (FTUE)
// ==========================================
// Data for the tutorial steps
const tutorialData = [
    {
        text: "Welcome, Hunter. This is your <strong>Command Center</strong>. Here you will manage your daily operations and track your growth.",
        highlight: null 
    },
    {
        text: "Observe the <strong>XP Bar</strong> on the left. Completing tasks increases your Rank. Do not slack off.",
        highlight: ".profile-section" 
    },
    {
        text: "CRITICAL: To generate your <strong>Daily Missions</strong>, the System needs to calibrate your mental state.",
        highlight: "#mood-check h2" 
    },
    {
        text: "Select your current <strong>Energy Level</strong> below. <br>🔥 High Energy = Hard Tasks.<br>😫 Low Energy = Recovery Tasks.",
        highlight: ".mood-selector" 
    }
];

// STARTUP LOGIC: Tutorial OR Bunk Check
window.onload = function() {
    const isTutorialDone = localStorage.getItem('hunter_tutorial_done');
    
    if (!isTutorialDone) {
        startTutorial();
    } else {
        checkSystemStatus(); // Run normal checks
    }
};

function startTutorial() {
    document.getElementById('tutorial-overlay').style.display = 'block';
    showStep(0);
}

function showStep(index) {
    const data = tutorialData[index];
    const textBox = document.getElementById('tutorial-text');
    const spotlight = document.getElementById('spotlight');
    const box = document.getElementById('tutorial-box');

    // Typewriter effect logic
    textBox.innerHTML = data.text; 

    // Highlight Logic
    if (data.highlight) {
        const element = document.querySelector(data.highlight);
        if (element) {
            const rect = element.getBoundingClientRect();
            spotlight.style.display = 'block';
            spotlight.style.top = (rect.top - 10) + 'px';
            spotlight.style.left = (rect.left - 10) + 'px';
            spotlight.style.width = (rect.width + 20) + 'px';
            spotlight.style.height = (rect.height + 20) + 'px';

            // Avoid overlapping the box with the highlight
            if (rect.top > window.innerHeight / 2) {
                box.style.top = "30%"; 
            } else {
                box.style.top = "70%"; 
            }
        }
    } else {
        spotlight.style.display = 'none';
        box.style.top = "50%";
    }
}

function nextTutorialStep() {
    tutorialStep++;
    if (tutorialStep < tutorialData.length) {
        showStep(tutorialStep);
    } else {
        // End Tutorial
        document.getElementById('tutorial-overlay').style.display = 'none';
        localStorage.setItem('hunter_tutorial_done', 'true');
        checkSystemStatus(); // Run checks after tutorial
    }
}

// ==========================================
// 3. BUNK / ROUTINE CHECK
// ==========================================
function checkSystemStatus() {
    if(!savedRoutine) return;
    const routine = JSON.parse(savedRoutine);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = timeToMinutes(routine.collegeStart);
    const endMinutes = timeToMinutes(routine.collegeEnd);

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        document.getElementById('bunk-modal').style.display = 'flex';
    }
}
function timeToMinutes(str) { if(!str) return 0; const [h, m] = str.split(':').map(Number); return h*60+m; }
function closeBunkModal() { document.getElementById('bunk-modal').style.display = 'none'; }
function confirmBunk() { alert("😈 Bonus Session Activated! +50% XP Multiplier."); closeBunkModal(); }

// ==========================================
// 4. CORE DASHBOARD LOGIC
// ==========================================
function selectMood(mood) {
    document.getElementById('mood-check').style.display = 'none';
    document.getElementById('loading-tasks').style.display = 'block';
    sessionStartTime = new Date(); // Reset timer

    const weekData = blueprint.roadmap[0] || { theme: "Orientation" };
    generateDailyPlan(weekData, mood);
}

async function generateDailyPlan(weekData, mood) {
    try {
        const res = await fetch(`${API_BASE_URL}/generate-daily-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentWeekData: weekData, completedTopics: [], hoursPerDay: 3, mood: mood })
        });
        const data = await res.json();
        renderDashboard(data);
    } catch (err) {
        console.error(err);
        renderDashboard({
            focus_mode: "Offline Protocol", daily_quote: "System Offline. Persevere.", wellness_tip: "Drink water.",
            tasks: [{id:1, title:"Review Notes", duration_min:45, type:"Core", reason:"Server unavailable"}] 
        });
    }
}

function renderDashboard(data) {
    document.getElementById('loading-tasks').style.display = 'none';
    document.getElementById('tasks-container').style.display = 'block';

    document.getElementById('focus-mode-badge').innerText = `Strategy: ${data.focus_mode}`;
    document.getElementById('wellness-tip').innerText = data.wellness_tip;

    const list = document.getElementById('task-list');
    list.innerHTML = '';

    // Staggered Animation Rendering
    data.tasks.forEach((task, index) => {
        const delay = index * 150;
        const div = document.createElement('div');
        div.className = index === 0 ? 'task-card task-active' : 'task-card';
        div.id = `task-${task.id}`;
        div.style.animationDelay = `${delay}ms`;
        
        div.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:bold; color:#fff; font-size:1.1rem;">${task.title}</div>
                <div style="font-size:0.85rem; color:var(--neon-blue); margin-top:5px;">
                    <i class="fas fa-clock"></i> ${task.duration_min} MIN • <span style="color:#aaa">${task.type}</span>
                </div>
                <div id="badge-${task.id}" style="font-size:0.75rem; margin-top:5px; height:15px;"></div>
            </div>
            <div class="btn-check" onclick="completeTask('${task.id}', this, event)">
                <i class="fas fa-check"></i>
            </div>
        `;
        list.appendChild(div);
    });
    
    startTimer();
}

function completeTask(id, btn, e) {
    const card = document.getElementById(`task-${id}`);
    const badge = document.getElementById(`badge-${id}`);
    
    if(!btn.classList.contains('checked')) {
        btn.classList.add('checked');
        card.classList.add('task-completed');
        card.classList.remove('task-active');
        
        // Particles & Speed Logic
        createParticles(e.clientX, e.clientY);
        const mins = Math.floor((new Date() - sessionStartTime)/60000);
        
        if(mins < 30) {
            badge.innerHTML = `<span style="color:var(--neon-gold);">⚡ GODSPEED (${mins}m)</span>`;
            updateXP(35);
        } else {
            updateXP(20);
        }
        sessionStartTime = new Date();
    } else {
        btn.classList.remove('checked');
        card.classList.remove('task-completed');
        badge.innerHTML = "";
    }
}

// FX: Particles
function createParticles(x, y) {
    const container = document.getElementById('particles-container');
    const colors = ['#00eaff', '#bd00ff', '#ffd700'];
    for(let i=0; i<20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = x + 'px'; p.style.top = y + 'px';
        p.style.backgroundColor = colors[Math.floor(Math.random()*colors.length)];
        const tx = (Math.random() - 0.5) * 200;
        const ty = (Math.random() - 0.5) * 200;
        p.style.setProperty('--tx', `${tx}px`); p.style.setProperty('--ty', `${ty}px`);
        container.appendChild(p);
        setTimeout(() => p.remove(), 800);
    }
}

function updateXP(amount) {
    const bar = document.getElementById('xp-bar-fill');
    let w = parseInt(bar.style.width || 0);
    let newW = Math.min(w + amount, 100);
    bar.style.width = newW + "%";
    document.getElementById('xp-text').innerText = newW + "%";
}

function startTimer() {
    setInterval(() => {
        const d = new Date();
        if(document.getElementById('timer')) document.getElementById('timer').innerText = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    }, 1000);
}   