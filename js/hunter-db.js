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
        await checkAndCreateProfile(user);
    } else {
        console.log("👤 No Hunter ID found. Playing as Guest.");
    }
});

// 🔥 2. SMART PROFILE SYNC (Local vs Cloud check karega)
async function checkAndCreateProfile(user) {
    try {
        const hunterRef = doc(db, "hunters", user.uid);
        const docSnap = await getDoc(hunterRef);
        
        // Local Storage se current XP uthao
        const localXP = parseInt(localStorage.getItem('add_xp') || "0");

        if (!docSnap.exists()) {
            // 🔥 CASE A: New User (Cloud par account nahi hai)
            await setDoc(hunterRef, {
                codename: user.displayName || "Unknown Hunter",
                email: user.email,
                rank: "E-Rank",
                total_xp: localXP, // Local XP se start karo
                guild: "Ronin", 
                createdAt: new Date()
            });
            console.log(`✅ New Profile Created. Synced Local XP: ${localXP}`);
        } else {
            // 🔥 CASE B: Old User (Account hai, sync check karo)
            const cloudData = docSnap.data();
            const cloudXP = cloudData.total_xp || 0;

            console.log(`📊 SYNC CHECK: Local (${localXP}) vs Cloud (${cloudXP})`);

            if (localXP > cloudXP) {
                // ✅ Local aage hai -> Cloud ko update karo
                await updateDoc(hunterRef, { total_xp: localXP });
                console.log("☁️ Cloud Updated to match Local Progress.");
            } 
            else if (cloudXP > localXP) {
                // ✅ Cloud aage hai -> Local update karo
                localStorage.setItem('add_xp', cloudXP);
                console.log("💻 Local Updated to match Cloud Progress.");
                
                // UI refresh agar page par XP dikh raha hai
                if(document.getElementById('xp-text')) {
                    location.reload(); 
                }
            }
            else {
                console.log("✅ Data is already Synced.");
            }
        }
    } catch (e) {
        console.error("Profile Sync Error:", e);
    }
}

// 🔥 3. GLOBAL XP SYNC FUNCTION 
// (Isse hum Window object se jod rahe hain taaki game-map.js ise use kar sake)
window.syncXPToCloud = async function(amount) {
    if (!currentUser) {
        console.warn("⚠️ Guest Mode: XP saved locally only.");
        return; 
    }

    // Agar hume exact value set karni hai (Total XP overwrite)
    // Ya agar hume increment karna hai (Existing XP + New XP)
    // Yahan hum increment use karenge safe updates ke liye
    
    const hunterRef = doc(db, "hunters", currentUser.uid);

    try {
        // Cloud par add karo
        await updateDoc(hunterRef, {
            total_xp: increment(amount)
        });
        
        console.log(`☁️ Cloud Sync Success: +${amount} XP Uploaded.`);
    } catch (e) {
        console.error("❌ Sync Failed:", e);
    }
};