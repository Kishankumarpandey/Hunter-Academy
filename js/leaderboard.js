// js/leaderboard.js
import { db, auth, onSnapshot, collection, query, orderBy, limit, doc, where, getCountFromServer } from "./firebase-config.js";

// 🔥 1. INIT LISTENER (Called when button is clicked)
export function initLeaderboardListener() {
    const listBody = document.getElementById('leaderboard-body');
    const myRankPanel = document.getElementById('my-sticky-rank');
    
    // ==================================================
    // A. LISTENER FOR TOP 50 PLAYERS (LEVEL 2+ ONLY) 🔥
    // ==================================================
    
    // Logic: Level 2 starts at 100 XP. So we filter total_xp >= 100.
    const q = query(
        collection(db, "hunters"), 
        where("total_xp", ">=", 100), // 👈 SIRF LEVEL 2+ DIKHEGA
        orderBy("total_xp", "desc"), 
        limit(50)
    );

    console.log("📡 Connecting to Hunter Association Database (Elite Only)...");

    onSnapshot(q, (snapshot) => {
        listBody.innerHTML = ""; // Clear Old Data
        
        if (snapshot.empty) {
            listBody.innerHTML = `<div style="text-align:center; padding:20px; color:#777;">NO ELITE HUNTERS YET.<br>REACH LEVEL 2 TO APPEAR HERE.</div>`;
            return;
        }

        let rank = 1;
        const currentUid = auth.currentUser ? auth.currentUser.uid : null;

        snapshot.forEach((docSnap) => {
            const hunter = docSnap.data();
            const isMe = (currentUid === docSnap.id);
            
            // Generate HTML Row
            const row = createRankCard(rank, hunter, isMe);
            listBody.appendChild(row);

            rank++;
        });
    });

    // ==================================================
    // B. 🔥 REAL RANK CALCULATION (Sticky Footer)
    // ==================================================
    if (auth.currentUser) {
        fetchMyRealRank(auth.currentUser.uid, myRankPanel);
    }
}

// 🔥 Function to Calculate Rank
async function fetchMyRealRank(uid, panel) {
    const myDocRef = doc(db, "hunters", uid);
    
    onSnapshot(myDocRef, async (docSnap) => {
        if (!docSnap.exists()) return;
        
        const myData = docSnap.data();
        const myXP = myData.total_xp || 0;

        // 2. Count people ahead of me (Filter bhi same hona chahiye)
        const coll = collection(db, "hunters");
        
        // Count all players with MORE XP than me
        const q = query(coll, where("total_xp", ">", myXP));
        
        try {
            const snapshot = await getCountFromServer(q);
            const peopleAboveMe = snapshot.data().count;
            const myRealRank = peopleAboveMe + 1;

            // UI Update
            panel.classList.remove('hidden');
            document.getElementById('my-rank-num').innerText = `#${myRealRank}`; 
            document.getElementById('my-rank-xp').innerText = `${myXP.toLocaleString()} XP`;
            
            const guildSpan = panel.querySelector('.rank-guild');
            if(guildSpan) guildSpan.innerText = myData.guild || "Ronin";

        } catch (error) {
            console.error("Error calculating rank:", error);
            document.getElementById('my-rank-num').innerText = "YOU";
        }
    });
}

// 🔥 HTML GENERATOR
function createRankCard(rank, hunter, isMe) {
    const div = document.createElement('div');
    
    let rankClass = '';
    let icon = '<i class="fas fa-user"></i>';

    if(rank === 1) { rankClass = 'rank-1'; icon = '<i class="fas fa-crown"></i>'; }
    else if(rank === 2) { rankClass = 'rank-2'; icon = '<i class="fas fa-medal"></i>'; }
    else if(rank === 3) { rankClass = 'rank-3'; icon = '<i class="fas fa-award"></i>'; }

    div.className = `rank-row ${rankClass}`;
    if(isMe) div.style.cssText = "border:1px solid var(--neon-blue); background:rgba(0, 234, 255, 0.1);";

    // Level Calculate karna padega XP se
    const level = Math.floor(hunter.total_xp / 100) + 1;

    div.innerHTML = `
        <div class="rank-num">#${rank}</div>
        <div class="rank-avatar">${icon}</div>
        <div class="rank-info">
            <span class="rank-name">${hunter.codename} <span style="font-size:0.7rem; color:#aaa; margin-left:5px;">(LVL ${level})</span></span>
            <span class="rank-guild">${hunter.guild || "Solo Player"}</span>
        </div>
        <div class="rank-xp">${hunter.total_xp.toLocaleString()} XP</div>
    `;
    return div;
}

window.toggleLeaderboard = function() {
    const panel = document.getElementById('leaderboard-panel');
    panel.classList.toggle('closed');

    if (!panel.classList.contains('closed') && !window.isLeaderboardLoaded) {
        initLeaderboardListener();
        window.isLeaderboardLoaded = true;
    }
    
    if(window.audioSys) audioSys.play('hover');
}