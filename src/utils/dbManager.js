const fs = require('fs');
const path = require('path');

// 🔥 Path wahi rakho jo tumhare project me hai
const DB_PATH = path.join(__dirname, '../../assets/data/game-library.json');

// Game ko Database me permanent save karne ka function
function saveGameToLibrary(gameObj, category = "CS") {
    try {
        console.log(`💾 DB Manager: Saving "${gameObj.name}" to library...`);

        // 1. File Padho
        if (!fs.existsSync(DB_PATH)) {
            console.error("❌ DB File missing!");
            return false;
        }
        const rawData = fs.readFileSync(DB_PATH, 'utf8');
        const library = JSON.parse(rawData);

        // 2. Duplicate Check (Agar URL pehle se hai to mat save karo)
        let isDuplicate = false;
        Object.keys(library).forEach(cat => {
            if (library[cat].some(g => g.url === gameObj.url)) isDuplicate = true;
        });

        if (isDuplicate) {
            console.log("⚠️ DB Manager: Game already exists. Skipping save.");
            return true; // Already saved hai, isliye success return karo
        }

        // 3. Category Check (Agar category nahi hai to banao)
        if (!library[category]) {
            library[category] = [];
        }

        // 4. New Game Push karo
        library[category].push({
            name: gameObj.name,
            url: gameObj.url,
            tags: gameObj.tags, // Tags array hona chahiye
            description: gameObj.description
        });

        // 5. Wapas File me Write karo
        fs.writeFileSync(DB_PATH, JSON.stringify(library, null, 4));
        console.log("✅ DB Manager: Database Upgraded Successfully!");
        return true;

    } catch (error) {
        console.error("❌ DB Write Error:", error.message);
        return false;
    }
}

module.exports = { saveGameToLibrary };