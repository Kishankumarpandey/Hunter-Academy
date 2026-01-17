// js/hunter-db.js
import { db, auth, doc, setDoc, getDoc, updateDoc, increment, onAuthStateChanged } from "./firebase-config.js";

let currentUser = null;

// 🔥 1. LISTENER: User login detect karta hai
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log(`Hunter Identified: ${user.email}`);
        await checkAndCreateProfile(user);
    } else {
        console.log("No Hunter ID found. Playing as Guest.");
    }
});

// 🔥 2. SMART PROFILE SYNC (Local vs Cloud check karega)
async function checkAndCreateProfile(user) {
    const hunterRef = doc(db, "hunters", user.uid);
    const docSnap = await getDoc(hunterRef);
    
    // Local Storage se current XP uthao
    const localXP = parseInt(localStorage.getItem('add_xp') || "0");

    if (!docSnap.exists()) {
        // 🔥 CASE A: New User (Cloud par account nahi hai)
        // Toh hum Local XP ko hi Cloud par upload kar denge
        try {
            await setDoc(hunterRef, {
                codename: user.displayName || "Unknown Hunter",
                email: user.email,
                rank: "E-Rank",
                total_xp: localXP, // Starts with existing Local XP
                guild: "Ronin", 
                createdAt: new Date()
            });
            console.log(`✅ New Profile Created. Synced Local XP: ${localXP}`);
        } catch (e) {
            console.error("Error creating profile:", e);
        }
    } else {
        // 🔥 CASE B: Old User (Account hai, ab sync check karo)
        const cloudData = docSnap.data();
        const cloudXP = cloudData.total_xp || 0;

        console.log(`📊 SYNC CHECK: Local (${localXP}) vs Cloud (${cloudXP})`);

        if (localXP > cloudXP) {
            // ✅ Local aage hai -> Cloud ko update karo
            await updateDoc(hunterRef, { total_xp: localXP });
            console.log("☁️ Cloud Updated to match Local Progress.");
        } 
        else if (cloudXP > localXP) {
            // ✅ Cloud aage hai (kisi aur device se khela hoga) -> Local update karo
            localStorage.setItem('add_xp', cloudXP);
            console.log("💻 Local Updated to match Cloud Progress.");
            
            // UI refresh request (agar page load ho chuka hai)
            if(document.getElementById('xp-text')) {
                location.reload(); 
            }
        }
        else {
            console.log("✅ Data is already Synced.");
        }
    }
}

// 🔥 3. XP SYNC FUNCTION (Jab Game Complete hota hai tab call hota hai)
export async function syncXPToCloud(amount) {
    if (!currentUser) return; // Guest hai to save mat karo

    const hunterRef = doc(db, "hunters", currentUser.uid);

    try {
        await updateDoc(hunterRef, {
            total_xp: increment(amount) // 🔥 Cloud par XP add karo
        });
        console.log(`☁️ Cloud Sync: +${amount} XP Uploaded.`);
    } catch (e) {
        console.error("Sync Failed:", e);
    }
}
// js/hunter-db.js ke last line me ye add karein:

// 🔥 Make this available globally for game-map.js
window.syncXPToCloud = syncXPToCloud;