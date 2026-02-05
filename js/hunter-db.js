// js/hunter-db.js
import { db, auth } from "./firebase-config.js";
import { doc, setDoc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

console.log("🔌 Hunter DB Module Initialized");

// 🔥 1. LISTENER: User login detect karta hai
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log(`🎯 Hunter Identified: ${user.email}`);
        
        // 1. Profile & XP Check
        await checkAndCreateProfile(user);

        // 2. 🔥 History Load (Ye naya hai)
        await loadCloudHistory(user);

    } else {
        console.log("👤 No Hunter ID found. Playing as Guest.");
    }
});

// 🔥 2. SMART PROFILE SYNC (XP Handling)
async function checkAndCreateProfile(user) {
    try {
        const hunterRef = doc(db, "hunters", user.uid);
        const docSnap = await getDoc(hunterRef);
        
        const localXP = parseInt(localStorage.getItem('add_xp') || "0");

        if (!docSnap.exists()) {
            // New User
            await setDoc(hunterRef, {
                codename: user.displayName || "Unknown Hunter",
                email: user.email,
                rank: "E-Rank",
                total_xp: localXP,
                guild: "Ronin", 
                dungeonHistory: [], // Empty history start karo
                createdAt: new Date()
            });
            console.log(`✅ New Profile Created.`);
        } else {
            // Old User - Sync XP
            const cloudData = docSnap.data();
            const cloudXP = cloudData.total_xp || 0;

            if (localXP > cloudXP) {
                await updateDoc(hunterRef, { total_xp: localXP });
                console.log("☁️ Cloud Updated (XP).");
            } 
            else if (cloudXP > localXP) {
                localStorage.setItem('add_xp', cloudXP);
                console.log("💻 Local Updated (XP).");
                if(document.getElementById('xp-text')) location.reload(); 
            }
        }
    } catch (e) {
        console.error("Profile Sync Error:", e);
    }
}

// 🔥 3. LOAD HISTORY FROM CLOUD (New Function)
async function loadCloudHistory(user) {
    try {
        const hunterRef = doc(db, "hunters", user.uid);
        const docSnap = await getDoc(hunterRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.dungeonHistory && Array.isArray(data.dungeonHistory)) {
                // Cloud se LocalStorage me daalo
                localStorage.setItem('dungeon_history', JSON.stringify(data.dungeonHistory));
                console.log("📜 Dungeon History Restored from Cloud.");
                
                // UI Refresh karo
                if (typeof window.loadRecentDungeons === 'function') {
                    window.loadRecentDungeons();
                }
            }
        }
    } catch (error) {
        console.error("History Load Error:", error);
    }
}

// 🔥 4. GLOBAL SYNC FUNCTIONS (Window se connect)

// A. XP Sync
window.syncXPToCloud = async function(amount) {
    if (!currentUser) return;
    const hunterRef = doc(db, "hunters", currentUser.uid);
    try {
        await updateDoc(hunterRef, { total_xp: increment(amount) });
        console.log(`☁️ XP Synced: +${amount}`);
    } catch (e) {
        console.error("XP Sync Failed:", e);
    }
};

// B. History Sync (Ye function missing tha!)
window.syncHistoryToCloud = async function(historyArray) {
    if (!currentUser) return; // Login nahi to return
    
    const hunterRef = doc(db, "hunters", currentUser.uid);
    try {
        // Sirf history update karo, baaki data (XP) ko mat chedo (merge: true ki zaroorat nahi updateDoc me)
        await updateDoc(hunterRef, { 
            dungeonHistory: historyArray,
            lastActive: new Date()
        });
        console.log("☁️ History Synced to Cloud!");
    } catch (error) {
        // Agar document nahi bana hai to setDoc use karo
        console.warn("Update failed, trying setDoc...", error);
        await setDoc(hunterRef, { dungeonHistory: historyArray }, { merge: true });
    }
};