import { db, auth, collection, addDoc, updateDoc, doc, query, where, getDocs, arrayUnion, getDoc } from "./firebase-config.js";

// === 1. UI FUNCTIONS ===
window.openGuildInterface = function() {
    const overlay = document.getElementById('guild-overlay');
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    checkMyGuildStatus();
}

window.closeGuildInterface = function() {
    document.getElementById('guild-overlay').style.display = 'none';
}

// === 2. CHECK STATUS ===
async function checkMyGuildStatus() {
    if (!auth.currentUser) return;
    
    const hunterRef = doc(db, "hunters", auth.currentUser.uid);
    const snap = await getDoc(hunterRef);
    
    if (snap.exists()) {
        const data = snap.data();
        if (data.guildId) {
            // Dashboard dikhao aur Members load karo
            showGuildDashboard(data.guild, data.guildCode, data.guildId);
        }
    }
}

function showGuildDashboard(name, code, guildId) {
    document.querySelector('.guild-content').style.display = 'none'; // Hide Forms
    const statsDiv = document.getElementById('my-guild-stats');
    statsDiv.classList.remove('hidden');
    
    document.getElementById('display-guild-name').innerText = name.toUpperCase();
    document.getElementById('display-guild-code').innerText = code || "Fetching...";

    // 🔥 Load Members List
    if(guildId) loadGuildMembers(guildId);
}

// 🔥 NEW: FETCH MEMBERS FUNCTION
async function loadGuildMembers(guildId) {
    const listContainer = document.getElementById('guild-members-list');
    listContainer.innerHTML = `<div style="color:#aaa;">Searching Signals...</div>`;

    try {
        // 1. Get Guild Document to find Member IDs
        const guildSnap = await getDoc(doc(db, "guilds", guildId));
        if(!guildSnap.exists()) return;

        const memberIDs = guildSnap.data().members || [];
        listContainer.innerHTML = ""; // Clear loading text

        // 2. Loop through IDs and fetch Names
        // (Note: For large guilds, we would query 'where in', but for small groups loop is fine)
        for (const uid of memberIDs) {
            const userSnap = await getDoc(doc(db, "hunters", uid));
            if (userSnap.exists()) {
                const hunter = userSnap.data();
                const level = Math.floor((hunter.total_xp || 0) / 100) + 1;
                
                // HTML Card for each member
                const isMe = (uid === auth.currentUser.uid) ? '(YOU)' : '';
                const color = (uid === auth.currentUser.uid) ? 'var(--neon-gold)' : 'white';

                const div = document.createElement('div');
                div.style.cssText = "background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;";
                div.innerHTML = `
                    <div>
                        <span style="color:${color}; font-weight:bold;">${hunter.codename} ${isMe}</span>
                        <span style="font-size:0.7rem; color:#aaa; display:block;">${hunter.rank} • LVL ${level}</span>
                    </div>
                    <div style="color:var(--neon-blue); font-size:0.9rem;">${(hunter.total_xp || 0).toLocaleString()} XP</div>
                `;
                listContainer.appendChild(div);
            }
        }

    } catch (e) {
        console.error("Error loading members:", e);
        listContainer.innerHTML = `<div style="color:red;">Signal Lost.</div>`;
    }
}

// === 3. CREATE GUILD ===
window.createGuild = async function() {
    const nameInput = document.getElementById('new-guild-name').value;
    if (!nameInput) return alert("Enter a Guild Name!");
    
    const code = "SL-" + Math.floor(1000 + Math.random() * 9000);

    try {
        const guildRef = await addDoc(collection(db, "guilds"), {
            name: nameInput,
            code: code,
            leader: auth.currentUser.uid,
            members: [auth.currentUser.uid],
            createdAt: new Date()
        });

        const hunterRef = doc(db, "hunters", auth.currentUser.uid);
        await updateDoc(hunterRef, {
            guild: nameInput,
            guildId: guildRef.id,
            guildCode: code
        });

        showGuildDashboard(nameInput, code, guildRef.id);

    } catch (e) {
        alert("Failed to create guild.");
    }
}

// === 4. JOIN GUILD ===
window.joinGuild = async function() {
    const codeInput = document.getElementById('guild-code-input').value.trim().toUpperCase();
    if (!codeInput) return alert("Enter Invite Code!");

    try {
        const q = query(collection(db, "guilds"), where("code", "==", codeInput));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return alert("❌ Invalid Guild Code!");

        const guildDoc = querySnapshot.docs[0];
        const guildData = guildDoc.data();
        const guildId = guildDoc.id;

        // Check if already in guild (optional safety)
        if(guildData.members.includes(auth.currentUser.uid)) {
            alert("You are already in this guild!");
            showGuildDashboard(guildData.name, guildData.code, guildId);
            return;
        }

        await updateDoc(doc(db, "guilds", guildId), {
            members: arrayUnion(auth.currentUser.uid)
        });

        await updateDoc(doc(db, "hunters", auth.currentUser.uid), {
            guild: guildData.name,
            guildId: guildId,
            guildCode: guildData.code
        });

        alert(`🎉 JOINED GUILD: ${guildData.name}`);
        showGuildDashboard(guildData.name, guildData.code, guildId);

    } catch (e) {
        console.error(e);
        alert("System Error while joining.");
    }
}