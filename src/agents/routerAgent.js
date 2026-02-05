const fs = require('fs');
const path = require('path');

// Path fix based on your structure
const DB_PATH = path.join(__dirname, '../../assets/data/game-library.json');

async function findExistingGame(videoTitle) {
    console.log(`📚 Agent 2 (Router): Scanning library for "${videoTitle}"...`);
    
    if (!fs.existsSync(DB_PATH)) {
        console.log("❌ DB File not found at:", DB_PATH);
        return null;
    }

    try {
        const gameLib = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const titleLower = videoTitle.toLowerCase();
        let matchedGame = null;

        // Search Logic
        Object.keys(gameLib).forEach(category => {
            gameLib[category].forEach(game => {
                // Check if title includes any tag from the game
                if (game.tags.some(tag => titleLower.includes(tag.toLowerCase()))) {
                    matchedGame = game;
                }
            });
        });

        if (matchedGame) {
            console.log(`✅ MATCH FOUND: ${matchedGame.name}`);
            return matchedGame;
        } else {
            console.log("⚠️ No Match Found. Proceeding to Generation.");
            return null;
        }

    } catch (error) {
        console.error("❌ Router Error:", error.message);
        return null;
    }
}

module.exports = { findExistingGame };