const transcriptAgent = require('../agents/transcriptAgent'); // 🔥 Ye missing tha!
const routerAgent = require('../agents/routerAgent');
const designerAgent = require('../agents/designerAgent');
const scoutAgent = require('../agents/scoutAgent');
const dbManager = require('../utils/dbManager');
const judgeAgent = require('../agents/judgeAgent'); // Judge bhi add kar diya safety ke liye

// =========================================================
// 🚀 MAIN PROCESS: VIDEO TO GAME
// =========================================================
async function processVideo(videoUrl) {
    console.log("\n🚀 OWL Orchestrator: Processing", videoUrl);

    try {
        // --- STEP 1: EXTRACT DATA ---
        let videoData = null;
        
        // Safety Check: Function exist karta hai ya nahi
        if (transcriptAgent && typeof transcriptAgent.extractVideoData === 'function') {
            videoData = await transcriptAgent.extractVideoData(videoUrl);
        } else if (transcriptAgent && typeof transcriptAgent.getTranscript === 'function') {
            const text = await transcriptAgent.getTranscript(videoUrl);
            videoData = { text: text, title: "Unknown Title" };
        } else {
            throw new Error("Transcript Agent not configured correctly.");
        }
        
        const titleToCheck = videoData.title || "Coding Concept";
        // Clean topic string for search (Remove special chars)
        const cleanTopic = titleToCheck.replace(/Lecture \d+|:|\||Tutorial|Full Course/gi, '').trim();

        // --- STEP 2: CHECK LOCAL DB FIRST (Speed Optimization) ---
        console.log(`🔎 Checking Local Library for: ${titleToCheck}`);
        
        let existingGame = null;
        if(routerAgent && typeof routerAgent.findExistingGame === 'function') {
            existingGame = await routerAgent.findExistingGame(titleToCheck);
        }

        if (existingGame) {
            console.log("🎯 Manager: Game found in Local Library.");
            return { type: 'FOUND', data: existingGame };
        }

        // --- STEP 3: SCOUT THE WEB (Upgrade Mode) ---
        console.log("🌍 Manager: Not in DB. Scouting the Web to upgrade Database...");
        
        let webGame = null;
        if(scoutAgent && typeof scoutAgent.findWebGame === 'function') {
            webGame = await scoutAgent.findWebGame(cleanTopic);
        }

        if (webGame) {
            console.log("💎 Manager: Found a Gem! Upgrading Database...");
            
            // 🔥 SELF-LEARNING: Save this new game to JSON file
            if(dbManager && typeof dbManager.saveGameToLibrary === 'function') {
                dbManager.saveGameToLibrary(webGame, webGame.category || "CS");
            }

            return { type: 'FOUND', data: webGame };
        }

        // --- STEP 4: AI GENERATION (Fallback) ---
        console.log("🎨 Manager: No web game found. Generating custom game...");
        const contextText = videoData.text ? videoData.text.substring(0, 2000) : `Title: ${titleToCheck}`;
        
        let newGame = null;
        if(designerAgent && typeof designerAgent.generateGameData === 'function') {
            newGame = await designerAgent.generateGameData(contextText);
        }

        if (newGame) return { type: 'GENERATED', data: newGame };

        throw new Error("System could not provide a game.");

    } catch (error) {
        console.error("💥 ORCHESTRATOR ERROR:", error.message);
        throw error;
    }
}

// =========================================================
// ⚖️ SUB-PROCESS: PLAYER VALIDATION (The Judge)
// =========================================================
async function validatePlayerAction(actionData) {
    if(judgeAgent) return await judgeAgent.validateAction(actionData);
    return { success: true, xp: 0, message: "Judge Offline" };
}

async function getNextLevel() {
    if(judgeAgent) return await judgeAgent.getNextMission();
    return { found: false, message: "Judge Offline" };
}

module.exports = { processVideo, validatePlayerAction, getNextLevel };