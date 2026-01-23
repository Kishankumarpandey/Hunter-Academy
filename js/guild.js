import { db, auth, collection, addDoc, updateDoc, doc, query, where, getDocs, arrayUnion, arrayRemove, getDoc } from "./firebase-config.js";

// =================================================================
// 1. UI MANAGEMENT (OPEN/CLOSE)
// =================================================================

window.openGuildInterface = function() {
    const modal = document.getElementById('guild-modal');
    if (!modal) return console.error("Guild Modal not found in HTML");

    modal.classList.remove('hidden');
    modal.style.display = 'flex'; // Flexbox for centering
    
    // Reset Views temporarily while loading
    document.getElementById('guild-auth-view').classList.add('hidden');
    document.getElementById('my-guild-view').classList.add('hidden');
    
    checkMyGuildStatus();
}

window.closeGuildInterface = function() {
    const modal = document.getElementById('guild-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// =================================================================
// 2. CHECK STATUS & ROUTING
// =================================================================

async function checkMyGuildStatus() {
    if (!auth.currentUser) return;
    
    const hunterRef = doc(db, "hunters", auth.currentUser.uid);
    
    try {
        const snap = await getDoc(hunterRef);
        
        if (snap.exists()) {
            const data = snap.data();
            
            if (data.guildId && data.guildId !== "") {
                // ✅ USER HAS GUILD -> SHOW DASHBOARD
                showMyGuildView(data.guild, data.guildCode, data.guildId);
            } else {
                // ❌ NO GUILD -> SHOW JOIN/CREATE SCREEN
                showAuthView();
            }
        }
    } catch (e) {
        console.error("Guild Check Error:", e);
    }
}

function showAuthView() {
    const authView = document.getElementById('guild-auth-view');
    const myView = document.getElementById('my-guild-view');

    myView.classList.add('hidden');
    authView.classList.remove('hidden');
    authView.style.display = 'flex'; // Ensure split layout
}

function showMyGuildView(name, code, guildId) {
    const authView = document.getElementById('guild-auth-view');
    const myView = document.getElementById('my-guild-view');

    authView.classList.add('hidden');
    authView.style.display = 'none';
    
    myView.classList.remove('hidden');
    myView.style.display = 'block';
    
    // Populate Data
    document.getElementById('display-guild-name').innerText = name ? name.toUpperCase() : "GUILD";
    document.getElementById('display-guild-code').innerText = code || "ERR-404";

    // Load Members
    loadGuildMembers(guildId);
}

// =================================================================
// 3. CORE ACTIONS (CREATE / JOIN / LEAVE)
// =================================================================

// 🔥 CREATE GUILD
window.createGuild = async function() {
    const nameInput = document.getElementById('new-guild-name');
    const guildName = nameInput.value.trim();

    if (!guildName) return alert("Please enter a Guild Name.");
    
    // Generate Random Code (e.g., SL-4592)
    const code = "SL-" + Math.floor(1000 + Math.random() * 9000);

    try {
        // 1. Create Guild Doc
        const guildRef = await addDoc(collection(db, "guilds"), {
            name: guildName,
            code: code,
            leader: auth.currentUser.uid,
            members: [auth.currentUser.uid],
            createdAt: new Date()
        });

        // 2. Update User Doc
        const hunterRef = doc(db, "hunters", auth.currentUser.uid);
        await updateDoc(hunterRef, {
            guild: guildName,
            guildId: guildRef.id,
            guildCode: code
        });

        alert(`⚔️ GUILD ESTABLISHED: ${guildName}`);
        nameInput.value = ""; // Clear input
        showMyGuildView(guildName, code, guildRef.id);

    } catch (e) {
        console.error(e);
        alert("Failed to establish guild. System error.");
    }
}

// 🔥 JOIN GUILD (Updated ID)
window.joinFriendGuild = async function() {
    const codeInput = document.getElementById('friend-code-input');
    const code = codeInput.value.trim().toUpperCase();

    if (!code) return alert("Enter a valid Invite Code.");

    try {
        // 1. Find Guild by Code
        const q = query(collection(db, "guilds"), where("code", "==", code));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return alert("❌ Invalid Guild Code. Check with your friend.");
        }

        const guildDoc = querySnapshot.docs[0];
        const guildData = guildDoc.data();
        const guildId = guildDoc.id;

        // 2. Safety Check
        if (guildData.members.includes(auth.currentUser.uid)) {
            alert("You are already in this guild!");
            showMyGuildView(guildData.name, guildData.code, guildId);
            return;
        }

        // 3. Update DB
        await updateDoc(doc(db, "guilds", guildId), {
            members: arrayUnion(auth.currentUser.uid)
        });

        await updateDoc(doc(db, "hunters", auth.currentUser.uid), {
            guild: guildData.name,
            guildId: guildId,
            guildCode: guildData.code
        });

        alert(`🎉 WELCOME TO ${guildData.name.toUpperCase()}!`);
        codeInput.value = ""; // Clear Input
        showMyGuildView(guildData.name, guildData.code, guildId);

    } catch (e) {
        console.error(e);
        alert("System Error: Could not join guild.");
    }
}

// 🔥 LEAVE GUILD (New Feature)
window.leaveGuild = async function() {
    if(!confirm("Are you sure you want to leave your Guild? (XP will be retained)")) return;

    try {
        const uid = auth.currentUser.uid;
        const hunterRef = doc(db, "hunters", uid);
        const hunterSnap = await getDoc(hunterRef);
        
        if(!hunterSnap.exists()) return;
        const guildId = hunterSnap.data().guildId;

        if(guildId) {
            // Remove from Guild Members List
            await updateDoc(doc(db, "guilds", guildId), {
                members: arrayRemove(uid)
            });
        }

        // Update User Doc (Clear Guild Data)
        await updateDoc(hunterRef, {
            guild: "",
            guildId: "",
            guildCode: ""
        });

        alert("You have left the guild.");
        showAuthView(); // Go back to Join/Create screen

    } catch (e) {
        console.error(e);
        alert("Error leaving guild.");
    }
}

// =================================================================
// 4. MEMBER LIST LOADER
// =================================================================

async function loadGuildMembers(guildId) {
    const listContainer = document.getElementById('guild-members-list');
    listContainer.innerHTML = `<div style="color:#aaa; font-style:italic;">Syncing Member Data...</div>`;

    try {
        const guildSnap = await getDoc(doc(db, "guilds", guildId));
        if(!guildSnap.exists()) return;

        const memberIDs = guildSnap.data().members || [];
        listContainer.innerHTML = ""; // Clear loading text

        for (const uid of memberIDs) {
            const userSnap = await getDoc(doc(db, "hunters", uid));
            if (userSnap.exists()) {
                const hunter = userSnap.data();
                
                // Calculate Level based on XP (Example: 100 XP = 1 Level)
                const xp = hunter.total_xp || 0;
                const level = Math.floor(xp / 100) + 1;
                
                const isMe = (uid === auth.currentUser.uid);
                const nameColor = isMe ? 'var(--neon-gold)' : '#fff';
                const borderStyle = isMe ? 'border: 1px solid rgba(255,215,0,0.3);' : '';

                const div = document.createElement('div');
                div.style.cssText = `background:rgba(255,255,255,0.05); padding:10px; border-radius:5px; display:flex; justify-content:space-between; align-items:center; ${borderStyle}`;
                
                div.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fas fa-user-circle" style="color:${nameColor}; font-size:1.2rem;"></i>
                        <div>
                            <div style="color:${nameColor}; font-weight:bold; font-family:'Rajdhani'; font-size:1.1rem;">
                                ${hunter.codename || "Unknown"} ${isMe ? "(YOU)" : ""}
                            </div>
                            <div style="font-size:0.75rem; color:#888;">${hunter.rank || "E-RANK"} • LVL ${level}</div>
                        </div>
                    </div>
                    <div style="color:var(--neon-blue); font-weight:bold;">${xp.toLocaleString()} XP</div>
                `;
                listContainer.appendChild(div);
            }
        }
    } catch (e) {
        console.error("Error loading members:", e);
        listContainer.innerHTML = `<div style="color:red;">Failed to load members.</div>`;
    }
}