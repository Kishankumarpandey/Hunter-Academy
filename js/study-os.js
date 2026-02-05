// =============================================================
// 🔥 SMART CONFIG: LOCALHOST vs RENDER (AUTO SWITCH)
// =============================================================

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'                          // 🏠 Jab khud ke PC par ho
    : 'https://hunter-academy-1.onrender.com';         // ☁️ Jab Internet par (Render) par ho

console.log(`📡 System Connected to: ${API_BASE_URL}`);

// Temporary storage
let currentBlueprint = null;

async function generateBlueprint() {
    // 1. Capture Basic Inputs
    const goal = document.getElementById('goal').value;
    const focus = document.getElementById('focus').value; 
    const level = document.getElementById('level') ? document.getElementById('level').value : 'beginner';
    const startPoint = document.getElementById('startPoint') ? document.getElementById('startPoint').value : 'start';
    const hours = document.getElementById('hours').value;
    const weeks = document.getElementById('weeks').value;

    // 🔥 2. CAPTURE MULTIPLE SUBJECTS SYLLABUS
    // Purana code: const syllabus = document.getElementById('syllabus').value; (Yeh ab nahi chalega)
    
    // Naya Logic: Sare boxes se data nikalo aur ek string banao
    let consolidatedSyllabus = "";
    const subjectCards = document.querySelectorAll('.subject-card');
    
    if(subjectCards.length === 0) {
        alert("Please add at least one subject!");
        return;
    }

    subjectCards.forEach((card, index) => {
        const name = card.querySelector('.sub-name').value;
        const content = card.querySelector('.sub-content').value;
        
        if(name && content) {
            consolidatedSyllabus += `\n=== SUBJECT ${index+1}: ${name} ===\n${content}\n`;
        }
    });

    // 3. Validation
    if(!goal || !consolidatedSyllabus) {
        alert("System Error: Goal and Syllabus (for at least one subject) are required.");
        return;
    }

    // 4. UI Switch (Loading Mode)
    document.getElementById('input-section').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    try {
        // 5. Send Data to Server
        const res = await fetch(`${API_BASE_URL}/generate-blueprint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                careerGoal: goal,
                syllabus: consolidatedSyllabus, // 🔥 Bheja gaya combined data
                focus: focus,         
                level: level,          
                startPoint: startPoint,
                hoursPerDay: hours,
                durationWeeks: weeks
            })
        });

        const data = await res.json();
        currentBlueprint = data;
        
        renderBlueprint(data);

    } catch (err) {
        console.error(err);
        alert("Architect Failure: Server Connection Lost.");
        document.getElementById('loading').style.display = 'none';
        document.getElementById('input-section').style.display = 'block';
    }
}

function renderBlueprint(data) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('blueprint-result').style.display = 'block';

    // 1. Get User Settings for Display Headers
    const focus = document.getElementById('focus').value.toUpperCase();
    const level = document.getElementById('level') ? document.getElementById('level').value.toUpperCase() : 'BEGINNER';

    // 2. Render Strategy Header with Badges
    const summaryBox = document.getElementById('strategy-summary');
    summaryBox.innerHTML = `
        <div style="margin-bottom:15px; display:flex; gap:10px; flex-wrap:wrap;">
            <span style="background:#111; color:var(--neon-blue); padding:5px 12px; border-radius:4px; font-size:0.8rem; border:1px solid var(--neon-blue); font-weight:bold;">
                <i class="fas fa-crosshairs"></i> ${focus} STRATEGY
            </span>
            <span style="background:#111; color:var(--neon-purple); padding:5px 12px; border-radius:4px; font-size:0.8rem; border:1px solid var(--neon-purple); font-weight:bold;">
                <i class="fas fa-layer-group"></i> LEVEL: ${level}
            </span>
        </div>
        <div style="font-style:italic; border-left:3px solid #555; padding-left:10px; color:#ccc;">
            "${data.strategy_summary}"
        </div>
    `;

    // 3. Render Timeline (Weeks)
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';

    data.roadmap.forEach(week => {
        let topicsHtml = '';
        week.topics.forEach(t => {
            const isCore = t.tag.includes('CORE') || t.importance === 'HIGH';
            const badgeClass = isCore ? 'core-badge' : '';
            const borderStyle = isCore ? 'border-left: 3px solid var(--neon-blue); background:rgba(0, 234, 255, 0.05);' : 'border-left: 3px solid #444; background:rgba(255,255,255,0.02);';
            const textColor = isCore ? 'color:#fff;' : 'color:#aaa;';
            const icon = isCore ? '<i class="fas fa-star" style="font-size:0.7rem; color:var(--neon-gold); margin-left:5px;"></i>' : '';

            topicsHtml += `
                <div style="margin-top:8px; padding:10px; border-radius:4px; ${borderStyle}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="topic-badge ${badgeClass}">${t.tag}</span>
                        ${icon}
                    </div>
                    <strong style="display:block; margin-top:5px; ${textColor}">${t.name}</strong>
                    <div style="font-size:0.85rem; color:#777; margin-top:4px; font-style:italic;">↳ ${t.reason}</div>
                </div>
            `;
        });

        timeline.innerHTML += `
            <div class="week-card">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:8px; margin-bottom:10px;">
                    <span class="week-title" style="font-family:'Orbitron'; letter-spacing:1px; font-size:1.1rem;">
                        WEEK ${week.week} <span style="font-family:'Rajdhani'; color:#aaa; font-size:0.9rem;">// ${week.theme}</span>
                    </span>
                </div>
                
                <div>${topicsHtml}</div>
                
                <div style="margin-top:15px; padding:12px; background:rgba(189, 0, 255, 0.08); border:1px solid rgba(189, 0, 255, 0.3); border-radius:5px; color:#e0c3fc; font-size:0.9rem;">
                    <i class="fas fa-dungeon"></i> <strong>MINI RAID:</strong> ${week.mini_project_idea}
                </div>
            </div>
        `;
    });
}

function saveAndStart() {
    if(!currentBlueprint) return;
    localStorage.setItem('hunter_blueprint', JSON.stringify(currentBlueprint));
    localStorage.setItem('hunter_goal', document.getElementById('goal').value);
    
    alert("SYSTEM INTEGRATED: Blueprint Saved.\nRedirecting to Dashboard...");
    window.location.href = 'study-dashboard.html'; 
}