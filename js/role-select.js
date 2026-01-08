import { auth, db } from './firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let selectedRole = null;
let currentUser = null;

// --- 1. DATA: ROLES DICTIONARY ---
const rolesDatabase = {
    // COMPUTER SCIENCE
    'cse': [
        {
            id: 'fullstack',
            title: 'CODE MANCER',
            subtitle: 'Full Stack Developer',
            desc: 'The Architect of the Web. Builds systems from frontend to backend.',
            icon: 'fa-laptop-code',
            trending: false, // Classic
            stats: { label1: 'LOGIC', val1: '90%', label2: 'DESIGN', val2: '70%' }
        },
        {
            id: 'ai_ml',
            title: 'NEURAL MASTER',
            subtitle: 'AI & ML Engineer',
            desc: 'Teaches machines to think. Master of Python and Algorithms.',
            icon: 'fa-brain',
            trending: true, // Trending
            stats: { label1: 'MATH', val1: '95%', label2: 'DATA', val2: '90%' }
        },
        {
            id: 'cyber',
            title: 'NET RUNNER',
            subtitle: 'Cyber Security',
            desc: 'Protects the system from threats. Master of Penetration Testing.',
            icon: 'fa-user-shield',
            trending: true,
            stats: { label1: 'STEALTH', val1: '85%', label2: 'NET', val2: '90%' }
        }
    ],

    // ELECTRONICS (ECE)
    'ece': [
        {
            id: 'embedded',
            title: 'FIRMWARE KNIGHT',
            subtitle: 'Embedded Engineer',
            desc: 'Breathes life into silicon. Master of Microcontrollers (C/C++).',
            icon: 'fa-microchip',
            trending: false,
            stats: { label1: 'H/W', val1: '90%', label2: 'LOGIC', val2: '85%' }
        },
        {
            id: 'iot',
            title: 'NET MAGE',
            subtitle: 'IoT Engineer',
            desc: 'Connects the world. Master of Sensors, Cloud, and Automation.',
            icon: 'fa-wifi',
            trending: true,
            stats: { label1: 'NET', val1: '95%', label2: 'SENSORS', val2: '80%' }
        },
        {
            id: 'vlsi',
            title: 'SILICON ARCHITECT',
            subtitle: 'VLSI Engineer',
            desc: 'Designs the brain (Chips). Master of Verilog and Digital Design.',
            icon: 'fa-memory',
            trending: false,
            stats: { label1: 'PHYSICS', val1: '85%', label2: 'DIGITAL', val2: '98%' }
        }
    ],

    // MECHANICAL
    'mech': [
        {
            id: 'design',
            title: 'FORGE MASTER',
            subtitle: 'CAD/Design Engineer',
            desc: 'Visualizes the physical. Master of SolidWorks and AutoCAD.',
            icon: 'fa-drafting-compass',
            trending: false,
            stats: { label1: 'CREATIVITY', val1: '90%', label2: 'PHYSICS', val2: '80%' }
        },
        {
            id: 'robotics',
            title: 'MECHA PILOT',
            subtitle: 'Robotics Engineer',
            desc: 'Automates movement. Master of Actuators and Kinematics.',
            icon: 'fa-robot',
            trending: true,
            stats: { label1: 'CODE', val1: '70%', label2: 'MECH', val2: '95%' }
        },
        {
            id: 'auto',
            title: 'ENGINE TUNER',
            subtitle: 'Automotive Engineer',
            desc: 'Power and Speed. Master of Engines and EV Systems.',
            icon: 'fa-car',
            trending: true,
            stats: { label1: 'POWER', val1: '90%', label2: 'THERMAL', val2: '85%' }
        }
    ],

    // DEFAULT (Fallback)
    'default': [
        {
            id: 'explorer',
            title: 'SYSTEM NOVICE',
            subtitle: 'General Engineer',
            desc: 'Exploring the vast tech tree. Ready to learn anything.',
            icon: 'fa-user-astronaut',
            trending: false,
            stats: { label1: 'POTENTIAL', val1: '100%', label2: 'XP', val2: '0%' }
        }
    ]
};


// --- 2. AUTH & RENDER LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserBranch(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });
});

async function loadUserBranch(uid) {
    const container = document.getElementById('roles-container');
    const msg = document.getElementById('branch-detected-msg');

    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            // Default to 'cse' if branch is missing or unknown
            let branch = userData.branch ? userData.branch.toLowerCase() : 'cse'; 
            
            // Map common inputs to keys
            if(branch.includes('computer') || branch === 'cse' || branch === 'it') branch = 'cse';
            else if(branch.includes('electr') || branch === 'ece' || branch === 'eee') branch = 'ece';
            else if(branch.includes('mech')) branch = 'mech';
            else branch = 'cse'; // Default fallback

            msg.innerHTML = `> SYSTEM MESSAGE: BRANCH "${branch.toUpperCase()}" DETECTED`;
            
            // Render Cards
            renderCards(rolesDatabase[branch] || rolesDatabase['default']);
        }
    } catch (error) {
        console.error("Error fetching branch:", error);
        container.innerHTML = "<p style='color:red'>System Error: Could not load classes.</p>";
    }
}

function renderCards(roles) {
    const container = document.getElementById('roles-container');
    container.innerHTML = ""; // Clear loader

    roles.forEach(role => {
        const isTrending = role.trending ? `<div class="trending-badge"><i class="fas fa-fire"></i> TRENDING</div>` : '';
        
        const cardHTML = `
            <div class="role-card" onclick="selectRole(this, '${role.id}')">
                ${isTrending}
                <div class="role-icon"><i class="fas ${role.icon}"></i></div>
                <h3>${role.title}</h3>
                <p class="role-subtitle">${role.subtitle}</p>
                <p class="role-desc">${role.desc}</p>
                
                <div class="stats-preview">
                    <div class="stat-row">
                        <span>${role.stats.label1}</span>
                        <div class="bar"><div class="fill" style="width: ${role.stats.val1}; background: var(--primary);"></div></div>
                    </div>
                    <div class="stat-row">
                        <span>${role.stats.label2}</span>
                        <div class="bar"><div class="fill" style="width: ${role.stats.val2}; background: #bd00ff;"></div></div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

// --- 3. SELECTION LOGIC (Global Scope) ---
window.selectRole = function(element, roleId) {
    // UI Reset
    document.querySelectorAll('.role-card').forEach(card => card.classList.remove('active'));
    
    // Activate clicked
    element.classList.add('active');
    selectedRole = roleId;

    // Button Activate
    const btn = document.getElementById('awaken-btn');
    btn.classList.remove('disabled');
    btn.disabled = false;
    btn.innerHTML = `INITIALIZE: ${roleId.toUpperCase()}`;
};

window.confirmSelection = async function() {
    if(!selectedRole || !currentUser) return;

    const btn = document.getElementById('awaken-btn');
    btn.innerText = "UPDATING MAINFRAME...";
    
    try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            role: selectedRole,
            setupComplete: true
        });

        setTimeout(() => {
            window.location.href = 'game-map.html';
        }, 1000);

    } catch (error) {
        console.error("Error:", error);
        alert("Update Failed: " + error.message);
    }
};