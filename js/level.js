// Global State
let currentLevelId = 1; 
let levelData = null;
let questions = [];

document.addEventListener('DOMContentLoaded', () => {
    loadLevelData();
});

// --- 1. LOAD DATA ---
function loadLevelData() {
    // In a real app, get currentLevelId from URL params or localStorage
    // currentLevelId = parseInt(localStorage.getItem('current_quest_id')) || 1;

    fetch('assets/data/levels.json')
        .then(response => response.json())
        .then(data => {
            levelData = data.levels.find(l => l.level_id === currentLevelId);
            
            if (levelData) {
                document.getElementById('skill-title').innerText = levelData.skill_name;
                document.querySelector('.description').innerText = levelData.description;
                document.getElementById('copy-text').innerText = levelData.youtube_keyword;
                
                // Load MCQ questions initially
                questions = levelData.questions.easy; 
            }
        })
        .catch(error => console.error('Error:', error));
}

// --- 2. START MCQ PHASE ---
function startLevel() {
    if (!questions) return;

    const windowContent = document.querySelector('.quest-window');
    
    // Hide AI Guide during battle
    const aiSection = document.querySelector('.ai-guide-section');
    if(aiSection) aiSection.style.display = 'none';

    let quizHTML = `
        <div class="quest-header">
            <span class="quest-type" style="color: gold;"><i class="fas fa-dungeon"></i> PHASE 1: KNOWLEDGE CHECK</span>
            <span class="difficulty">${questions.length} QUESTIONS</span>
        </div>
        <h2 style="margin-bottom:20px; font-family:'Orbitron'">CLEAR THE MOBS</h2>
        <form id="quiz-form">
    `;

    questions.forEach((q, index) => {
        quizHTML += `
            <div class="question-block" style="margin-bottom: 25px; text-align: left; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px;">
                <p style="color: var(--neon-blue); margin-bottom: 12px; font-weight:bold;">0${index + 1} // ${q.text}</p>
                <div class="options-group" style="display: flex; flex-direction: column; gap: 8px;">
                    ${q.options.map((opt, i) => `
                        <label style="background: rgba(255,255,255,0.05); padding: 10px; cursor: pointer; border: 1px solid #333; display: flex; align-items: center; gap: 10px;">
                            <input type="radio" name="q${q.id}" value="${i}"> 
                            <span style="font-size: 0.9rem;">${opt}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });

    quizHTML += `</form><button class="start-btn" onclick="submitQuiz()">SUBMIT ANSWERS</button>`;
    windowContent.innerHTML = quizHTML;
}

// --- 3. CHECK MCQ ANSWERS ---
function submitQuiz() {
    let score = 0;
    const form = document.getElementById('quiz-form');
    const formData = new FormData(form);
    
    questions.forEach((q) => {
        const userAnswer = formData.get(`q${q.id}`);
        if (userAnswer !== null && parseInt(userAnswer) === q.correct) {
            score++;
        }
    });

    // Pass condition: 3 out of 7 (for testing purposes)
    if (score >= 3) {
        showPhase1Success(score);
    } else {
        showFailScreen(score);
    }
}

// --- 4. PHASE 1 SUCCESS -> PROMPT INTERVIEW ---
function showPhase1Success(score) {
    const windowContent = document.querySelector('.quest-window');
    
    windowContent.innerHTML = `
        <div class="quest-header">
            <span class="quest-type" style="color: #00ff00;">PHASE 1 COMPLETE</span>
        </div>
        <h1 style="color: #00ff00; font-family: 'Orbitron';">MOB CLEARED</h1>
        <p style="font-size: 1.2rem; margin-bottom: 20px;">Score: ${score}/${questions.length}</p>
        
        <div style="background: rgba(255, 0, 85, 0.1); border: 1px solid #ff0055; padding: 20px; margin-top: 20px;">
            <h3 style="color: #ff0055; font-family: 'Orbitron';"><i class="fas fa-skull"></i> BOSS BATTLE DETECTED</h3>
            <p style="color: #ddd; font-size: 0.9rem; margin-top: 10px;">
                The Interviewer has appeared. 
                <br>Logic and Theory knowledge required.
                <br>Auto-evaluation is DISABLED. Your answers will be saved for manual review.
            </p>
        </div>

        <button class="start-btn" style="margin-top: 20px; background: #ff0055; color: white;" onclick="startInterview()">
            ENTER INTERVIEW ROOM
        </button>
    `;
}

// --- 5. START INTERVIEW MODE ---
function startInterview() {
    const windowContent = document.querySelector('.quest-window');
    const interviewQs = levelData.questions.interview || [];

    if (interviewQs.length === 0) {
        // Fallback if no interview questions exist
        completeLevel(); 
        return;
    }

    let interviewHTML = `
        <div class="quest-header">
            <span class="quest-type" style="color: #ff0055;">PHASE 2: BOSS BATTLE</span>
            <span class="difficulty">INTERVIEW MODE</span>
        </div>
        <h2 style="margin-bottom:20px; font-family:'Orbitron'">THEORY DEFENSE</h2>
        <p style="color:#aaa; font-size:0.9rem; margin-bottom:20px;">
            Type your answers clearly. The System will record them for your portfolio.
        </p>
        <form id="interview-form">
    `;

    interviewQs.forEach((q, index) => {
        interviewHTML += `
            <div class="question-block" style="margin-bottom: 30px; text-align: left;">
                <p style="color: #ff0055; margin-bottom: 10px; font-weight:bold;">
                    <i class="fas fa-user-tie"></i> INTERVIEWER: "${q.text}"
                </p>
                <textarea name="int_q${q.id}" placeholder="Type your explanation here..." 
                style="width: 100%; height: 100px; background: rgba(0,0,0,0.5); border: 1px solid #444; color: white; padding: 10px; font-family: 'Rajdhani'; resize: vertical;"></textarea>
            </div>
        `;
    });

    interviewHTML += `
        </form>
        <button class="start-btn" onclick="submitInterview()">SUBMIT TO GUILD</button>
    `;

    windowContent.innerHTML = interviewHTML;
}

// --- 6. SUBMIT INTERVIEW (NO AUTO EVAL) ---
function submitInterview() {
    // 1. Simulate Saving Data
    const btn = document.querySelector('.start-btn');
    btn.innerHTML = "<i class='fas fa-circle-notch fa-spin'></i> UPLOADING TO SERVER...";
    
    // In a real app, you would POST the formData here to your backend
    
    setTimeout(() => {
        completeLevel();
    }, 1500);
}

// --- 7. LEVEL COMPLETE & UNLOCK ---
function completeLevel() {
    const windowContent = document.querySelector('.quest-window');
    
    // Unlock Logic
    let playerMax = parseInt(localStorage.getItem('player_max_level')) || 1;
    if (currentLevelId === playerMax) {
        let nextLevel = playerMax + 1;
        localStorage.setItem('player_max_level', nextLevel);
        console.log(`System: Level ${nextLevel} Unlocked.`);
    }

    windowContent.innerHTML = `
        <div style="text-align: center; margin-top: 40px;">
            <i class="fas fa-crown" style="font-size: 5rem; color: gold; margin-bottom: 20px; animation: float 3s infinite ease-in-out;"></i>
            
            <h1 style="color: gold; font-family: 'Orbitron'; font-size: 3rem;">QUEST CLEARED</h1>
            <p style="font-size: 1.2rem; color: #fff; margin-bottom: 20px;">Performance Grade: S</p>
            
            <div style="border: 1px dashed var(--neon-blue); padding: 15px; display: inline-block; margin-bottom: 30px;">
                <p style="color: var(--neon-blue); font-size: 0.9rem;">REWARD:</p>
                <p>+500 XP</p>
                <p>Skill: ${levelData.skill_name} [ACQUIRED]</p>
            </div>
            
            <button class="start-btn" onclick="location.href='game-map.html'">RETURN TO MAP</button>
        </div>
        <style>
            @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        </style>
    `;
}

// --- HELPER: FAIL SCREEN ---
function showFailScreen(score) {
    const windowContent = document.querySelector('.quest-window');
    windowContent.innerHTML = `
        <div class="quest-header"><span class="quest-type" style="color: red;">MISSION FAILED</span></div>
        <h1 style="color: #ff0055; font-family: 'Orbitron'; font-size: 3rem; margin-top: 20px;">YOU DIED</h1>
        <p style="color: #aaa;">Score: ${score} (Required: 3)</p>
        <p style="margin: 20px 0;">Your logic was flawed. Study the resources and try again.</p>
        <button class="start-btn" style="background: #ff0055;" onclick="location.reload()">RESPAWN</button>
    `;
}

// Add this function to your js/level.js file

function triggerRewardPopup(newLevel, skillName) {
    const overlay = document.getElementById('reward-overlay');
    
    // 1. Populate Data
    document.getElementById('popup-level').innerText = newLevel;
    document.getElementById('popup-skill').innerText = skillName;
    
    // Note: In a real app, 'JIN-WOO' would come from localStorage user name
    // document.getElementById('popup-char-name').innerText = "HUNTER: " + localStorage.getItem('player_name');

    // 2. Play Sound (Optional)
    // new Audio('assets/sounds/levelup.mp3').play();

    // 3. Show Popup
    overlay.classList.add('active');
}

function closeRewardPopup() {
    // Redirect to map to see unlocked node
    window.location.href = 'game-map.html';
}

// UPDATE your existing completeLevel() function to call this:
// Replace the bottom part of your completeLevel function with:
/* // ... inside completeLevel() ...
    
    // Instead of windowContent.innerHTML = `...`, do this:
    let currentMax = parseInt(localStorage.getItem('player_max_level')) || 1;
    let skillName = levelData ? levelData.skill_name : "UNKNOWN SKILL";
    
    // Trigger the popup
    triggerRewardPopup(currentMax, skillName);
*/