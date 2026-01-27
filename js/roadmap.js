/* =========================================
   ROADMAP.JS - MENTOR EDITION (6-POINT FORMULA)
   ========================================= */

const roleInput = document.getElementById('role-input');
const roadmapContainer = document.getElementById('roadmap-steps');
const loadingSpinner = document.getElementById('roadmap-loading');
const historyContainer = document.getElementById('role-history-container');
const HISTORY_KEY = 'hunter_roadmap_history';

// 🔥 1. Initialize
document.addEventListener("DOMContentLoaded", () => {
    renderHistory();
});

// 🔥 2. Main Fetch Function
window.fetchRoadmap = async function(roleName = null) {
    const query = (typeof roleName === 'string') ? roleName : roleInput.value.trim();

    if (!query) {
        alert("⚠️ System Message: Define your path first.");
        return;
    }

    roleInput.value = query;
    if(loadingSpinner) loadingSpinner.classList.remove('hidden');
    if(roadmapContainer) roadmapContainer.innerHTML = '';
    
    addToHistory(query);

    // 🕒 Simulate "Oracle Analysis"
    setTimeout(() => {
        const mockData = generateMentorData(query);
        renderMentorUI(mockData);
        if(loadingSpinner) loadingSpinner.classList.add('hidden');
    }, 1500);
};

// ==========================================
// 🔥 3. THE MENTOR DATA GENERATOR (6-Point Formula)
// ==========================================
function generateMentorData(role) {
    role = role.toLowerCase();
    let levels = [];

    // 🟦 VLSI / CHIP DESIGN (The Example You Gave)
    if(role.includes('vlsi') || role.includes('chip')) {
        levels = [
            {
                rank: "E-RANK",
                title: "Foundations of VLSI Thinking",
                why: "VLSI design base isn't just 'electronics', it represents 'logic in physics'.",
                outcome: "You will understand how hardware actually executes logic physically.",
                skills: ["Digital Logic Design", "Basic Electronics", "Verilog/VHDL Intro", "Boolean Algebra"],
                resources: [{name: "Neso Academy (Digital Logic)"}, {name: "Morris Mano (Book)"}],
                project: {
                    name: "Design a 4-Bit Counter",
                    focus: "Don't just code it. Convert Truth Table → Gates → Hardware. Understand propagation delay."
                },
                feeling: "I can think in gates, not just code."
            },
            {
                rank: "D-RANK",
                title: "CMOS & The Physical Layer",
                why: "Code means nothing if the transistor can't switch fast enough.",
                outcome: "You will visualize how electrons move to create 0s and 1s.",
                skills: ["MOSFET Theory", "IV Characteristics", "Inverter Design", "CMOS Fabrication Basics"],
                resources: [{name: "Razavi Electronics"}, {name: "CMOS VLSI Design (Weste)"}],
                project: {
                    name: "CMOS Inverter Simulation (SPICE)",
                    focus: "Observe how voltage changes over time. It's not instant; it's physics."
                },
                feeling: "I don't see 0 and 1. I see Voltage High and Voltage Low."
            },
            {
                rank: "C-RANK",
                title: "RTL Design & Architecture",
                why: "Now you build complex systems. This is where 'Coding' meets 'Circuitry'.",
                outcome: "You will learn to describe hardware behavior using code (HDL).",
                skills: ["Verilog FSM Design", "Static Timing Analysis (Basics)", "Pipelining", "FIFO Design"],
                resources: [{name: "HDLBits Practice"}, {name: "ChipVerify"}],
                project: {
                    name: "Traffic Light Controller (FSM)",
                    focus: "Focus on State Machines. How does the hardware 'remember' the current state?"
                },
                feeling: "I am an Architect. I define how data flows."
            },
            {
                rank: "B-RANK",
                title: "Verification (The Reality Check)",
                why: "A bug in hardware costs millions. You must break your own design.",
                outcome: "You will learn to write testbenches that find bugs humans miss.",
                skills: ["SystemVerilog", "UVM Methodology", "Assertions", "Functional Coverage"],
                resources: [{name: "Verification Academy"}, {name: "SystemVerilog for Verification (Spear)"}],
                project: {
                    name: "APB Protocol Verification IP",
                    focus: "Don't test if it works. Test what happens when it fails. Corner cases are key."
                },
                feeling: "My design is bulletproof. I have proven it."
            },
            {
                rank: "S-RANK",
                title: "Physical Design (Tape-out)",
                why: "The final frontier. Converting code into actual silicon blueprints.",
                outcome: "You will master the transition from logical code to physical geometric shapes (GDSII).",
                skills: ["Floorplanning", "Clock Tree Synthesis", "Routing", "DRC/LVS Signoff"],
                resources: [{name: "Physical Design (Khushal Vyas)"}, {name: "Synopsys/Cadence Manuals"}],
                project: {
                    name: "RISC-V Core Layout (GDSII)",
                    focus: "Power, Area, and Timing. Trade-offs are everything here."
                },
                feeling: "I am a God of Silicon. I create reality."
            }
        ];
    }
    // 🟧 WEB DEVELOPMENT (Mentor Style)
    else if(role.includes('web') || role.includes('front')) {
        levels = [
            {
                rank: "E-RANK",
                title: "The Structure of the Web",
                why: "Before painting (CSS) or moving (JS), you must build the skeleton.",
                outcome: "You will understand the semantic meaning behind every tag.",
                skills: ["HTML5 Semantics", "CSS Box Model", "DOM Tree", "HTTP Basics"],
                resources: [{name: "MDN Web Docs"}, {name: "CS50 (Week 0)"}],
                project: {
                    name: "Personal Portfolio (Raw HTML/CSS)",
                    focus: "No frameworks. Learn how the browser actually renders elements."
                },
                feeling: "I don't just copy code; I speak the browser's language."
            },
            {
                rank: "C-RANK",
                title: "The Logic Layer (JavaScript)",
                why: "A static site is a dead site. JS breathes life into the skeleton.",
                outcome: "You will master asynchronous behavior and data manipulation.",
                skills: ["ES6+ Syntax", "Event Loop", "Fetch API", "Promises/Async-Await"],
                resources: [{name: "JavaScript.info"}, {name: "Namaste JavaScript"}],
                project: {
                    name: "Weather Dashboard App",
                    focus: "Handle API delays gracefully. What happens if the internet cuts off?"
                },
                feeling: "I control the flow of data."
            },
            {
                rank: "A-RANK",
                title: "The Framework Ecosystem",
                why: "Scaling raw JS is painful. Frameworks offer structure and speed.",
                outcome: "You will think in 'Components' and 'State', not just pages.",
                skills: ["React/Next.js", "State Management (Redux)", "Tailwind CSS", "Hooks"],
                resources: [{name: "React Documentation"}, {name: "Frontend Masters"}],
                project: {
                    name: "E-Commerce Cart System",
                    focus: "State management complexity. How does adding an item update the header count instantly?"
                },
                feeling: "I build systems, not just pages."
            }
        ];
    }
    // ⬜ DEFAULT
    else {
        levels = [
            {
                rank: "E-RANK", title: "The Awakening",
                why: "Every journey begins with understanding the core philosophy.",
                outcome: "You will grasp the fundamental syntax and logic.",
                skills: ["Basic Syntax", "Logic Building", "Core Principles"],
                resources: [{name: "Official Docs"}, {name: "Crash Course"}],
                project: { name: "Hello World Plus", focus: "Understand execution flow." },
                feeling: "I have taken the first step."
            }
        ];
    }

    return { role: role, levels: levels };
}

// ==========================================
// 🔥 4. RENDER UI (THE MENTOR CARD STYLE)
// ==========================================
function renderMentorUI(data) {
    if(!roadmapContainer) return;
    roadmapContainer.innerHTML = "";

    if(!data.levels) return;

    // Header
    const header = document.createElement('div');
    header.style.cssText = "text-align:center; margin-bottom:40px; border-bottom:1px solid #333; padding-bottom:20px;";
    header.innerHTML = `
        <h1 style="color:#00eaff; font-family:'Orbitron'; font-size:2.5rem; margin:0; text-transform:uppercase; letter-spacing:2px; text-shadow:0 0 10px #00eaff;">
            ${data.role} PATH
        </h1>
        <p style="color:#aaa; font-family:'Rajdhani'; font-size:1.1rem; letter-spacing:1px; margin-top:5px;">
            // SYSTEM ANALYSIS: MENTOR MODE ACTIVE
        </p>
    `;
    roadmapContainer.appendChild(header);

    // Cards Loop
    data.levels.forEach((level, index) => {
        let rankColor = "#00eaff"; // Neon Blue
        if(level.rank.includes("S-RANK")) rankColor = "#ffd700"; // Gold
        if(level.rank.includes("B-RANK")) rankColor = "#ff0055"; // Red
        if(level.rank.includes("E-RANK")) rankColor = "#888"; // Grey

        // Skill Tags
        const skillsHtml = level.skills.map(s => 
            `<span style="background:rgba(255,255,255,0.1); color:#fff; padding:2px 8px; border-radius:4px; font-size:0.8rem; border:1px solid #444; margin-right:5px; margin-bottom:5px; display:inline-block;">${s}</span>`
        ).join('');

        // Resource Links
        const resourcesHtml = level.resources.map(r => 
            `<div style="color:${rankColor}; font-size:0.85rem; margin-bottom:2px;"><i class="fas fa-link"></i> ${r.name}</div>`
        ).join('');

        // CARD HTML
        const card = document.createElement('div');
        card.className = `roadmap-card delay-${index}`; // Animation class
        card.style.cssText = `
            background: #0a0f14; 
            border: 1px solid #333; 
            border-left: 5px solid ${rankColor}; 
            border-radius: 8px; 
            margin-bottom: 30px; 
            padding: 25px; 
            position: relative;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            animation: slideIn 0.5s ease forwards;
            opacity: 0;
            transform: translateY(20px);
            animation-delay: ${index * 0.2}s;
        `;

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222; padding-bottom:15px; margin-bottom:15px;">
                <div>
                    <h2 style="color:${rankColor}; font-family:'Orbitron'; margin:0; font-size:1.8rem;">${level.rank}</h2>
                    <h3 style="color:#fff; font-family:'Rajdhani'; margin:0; font-size:1.2rem; letter-spacing:1px;">${level.title}</h3>
                </div>
                <div style="opacity:0.2; font-size:3rem; color:${rankColor};"><i class="fas fa-chess-piece"></i></div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
                <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:5px;">
                    <small style="color:#777; font-weight:bold; letter-spacing:1px;">WHY THIS EXISTS</small>
                    <p style="color:#ccc; font-size:0.95rem; margin-top:5px; line-height:1.4;">${level.why}</p>
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:5px;">
                    <small style="color:#777; font-weight:bold; letter-spacing:1px;">AFTER THIS YOU WILL UNDERSTAND</small>
                    <p style="color:#ccc; font-size:0.95rem; margin-top:5px; line-height:1.4;">${level.outcome}</p>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; margin-bottom:20px;">
                <div>
                    <small style="color:#777; font-weight:bold; letter-spacing:1px; display:block; margin-bottom:8px;">ACQUIRE SKILLS</small>
                    <div>${skillsHtml}</div>
                </div>
                <div>
                    <small style="color:#777; font-weight:bold; letter-spacing:1px; display:block; margin-bottom:8px;">INTEL SOURCES</small>
                    <div>${resourcesHtml}</div>
                </div>
            </div>

            <div style="border:1px dashed ${rankColor}; padding:15px; border-radius:5px; background:rgba(${parseInt(rankColor.slice(1,3),16)}, ${parseInt(rankColor.slice(3,5),16)}, ${parseInt(rankColor.slice(5,7),16)}, 0.05);">
                <div style="color:${rankColor}; font-weight:bold; font-family:'Orbitron'; font-size:0.9rem; margin-bottom:5px;">
                    <i class="fas fa-hammer"></i> BUILD PROJECT: ${level.project.name}
                </div>
                <p style="color:#ddd; font-size:0.9rem; margin:0;">
                    <strong style="color:#fff;">Focus On:</strong> ${level.project.focus}
                </p>
            </div>

            <div style="margin-top:20px; text-align:right;">
                <p style="color:#aaa; font-style:italic; font-family:'Rajdhani'; font-size:1.1rem; border-right:3px solid ${rankColor}; padding-right:15px; display:inline-block;">
                    "${level.feeling}"
                </p>
            </div>
        `;

        roadmapContainer.appendChild(card);
    });

    // Download Button
    const footer = document.createElement('div');
    footer.innerHTML = `
        <div style="text-align:center; margin-top:40px; padding-bottom:30px;">
            <button onclick="alert('Saving Mentor Guide...')" style="background:transparent; color:${data.levels[0].rank.includes('S') ? '#ffd700' : '#00eaff'}; border:1px solid currentColor; padding:12px 30px; font-family:'Orbitron'; cursor:pointer; font-size:1rem; transition:0.3s;">
                <i class="fas fa-save"></i> SAVE GUIDE
            </button>
        </div>
    `;
    roadmapContainer.appendChild(footer);
}

// 🔥 5. History System (Standard)
function addToHistory(role) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    history = history.filter(item => item.toLowerCase() !== role.toLowerCase());
    history.unshift(role);
    if(history.length > 5) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    if(!historyContainer) return;
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    historyContainer.innerHTML = '';

    if(history.length === 0) {
        historyContainer.innerHTML = '<small style="color:#555;">No past paths.</small>';
        return;
    }

    history.forEach(role => {
        const btn = document.createElement('button');
        btn.className = 'history-chip';
        btn.style.cssText = "display:block; width:100%; padding:10px; margin-bottom:5px; background:#1a1a1a; border:1px solid #333; color:#aaa; cursor:pointer; text-align:left; border-radius:4px; font-family:'Rajdhani';";
        btn.innerHTML = `<i class="fas fa-history" style="color:var(--neon-blue)"></i> ${role}`;
        btn.onclick = () => fetchRoadmap(role);
        historyContainer.appendChild(btn);
    });
}

// CSS Animation Injector
const style = document.createElement('style');
style.innerHTML = `
@keyframes slideIn { to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(style);