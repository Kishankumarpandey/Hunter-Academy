const fs = require('fs');
const path = require('path');

const USER_DB_PATH = path.join(__dirname, '../../assets/data/user-progress.json');
const GAME_LIB_PATH = path.join(__dirname, '../../assets/data/game-library.json');

// Helper: User Data Read karo
function getUserData() {
    if (!fs.existsSync(USER_DB_PATH)) return { history: [], xp: 0, rank: "E" };
    return JSON.parse(fs.readFileSync(USER_DB_PATH, 'utf8'));
}

// Helper: User Data Save karo
function saveUserData(data) {
    fs.writeFileSync(USER_DB_PATH, JSON.stringify(data, null, 4));
}

// --- FUNCTION 1: Validate Action (Anti-Cheat) ---
async function validateAction(data) {
    console.log("⚖️ Judge Agent: Analyzing user behavior...", data);
    
    const user = getUserData();
    const { videoId, timeSpent, totalDuration, focusLostCount } = data;

    // RULE 1: Speedrunning (Agar video 10 min ka hai aur 2 min me band kiya)
    const requiredTime = totalDuration * 0.7; // Kam se kam 70% dekhna padega
    if (timeSpent < requiredTime) {
        return { 
            success: false, 
            xp: 0, 
            message: "⚠️ System Alert: You skipped the training. No XP awarded." 
        };
    }

    // RULE 2: Focus Check (Agar 10 baar tab switch kiya)
    if (focusLostCount > 10) {
        return { 
            success: true, 
            xp: 10, // Penalty (Bahut kam XP)
            message: "⚠️ Focus Lost: System detected distraction. XP Penalty applied." 
        };
    }

    // RULE 3: Spamming (Agar ye video aaj hi dekha hai)
    // (Simple logic: History check)
    if (user.history.includes(videoId)) {
        return { 
            success: true, 
            xp: 5, 
            message: "♻️ Revision Complete. (Reduced XP for repeat)" 
        };
    }

    // ✅ ALL GOOD: Full Reward
    const rewardXP = 100;
    
    // Save to History
    user.xp += rewardXP;
    if (!user.history.includes(videoId)) user.history.push(videoId);
    saveUserData(user);

    return { 
        success: true, 
        xp: rewardXP, 
        message: "✅ Training Complete! Stats Updated." 
    };
}

// --- FUNCTION 2: Get Next Mission (Video Rotation) ---
async function getNextMission() {
    const user = getUserData();
    const lib = JSON.parse(fs.readFileSync(GAME_LIB_PATH, 'utf8'));
    
    let allGames = [];
    Object.keys(lib).forEach(cat => {
        allGames = [...allGames, ...lib[cat]];
    });

    // Aisa video dhundo jo user ne ABHI TAK NAHI dekha (History check)
    const newMissions = allGames.filter(g => !user.history.includes(g.url));

    if (newMissions.length > 0) {
        // Randomly pick one from unplayed
        const next = newMissions[Math.floor(Math.random() * newMissions.length)];
        return { 
            found: true, 
            mission: next,
            message: "🆕 New Dungeon Unlocked based on your Rank."
        };
    } else {
        return { 
            found: false, 
            message: "🎉 All Dungeons Cleared! Resetting..." 
        };
    }
}

module.exports = { validateAction, getNextMission };