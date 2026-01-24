import { db, auth, collection, addDoc, query, where, getDocs, orderBy } from "./firebase-config.js";

// ==========================================
// 1. GENERATE & SAVE ROADMAP
// ==========================================
window.fetchRoadmap = async function() {
    const roleInput = document.getElementById('role-input');
    const role = roleInput ? roleInput.value.trim() : "";
    
    if (!role) return alert("⚠️ Enter a Job Role!");

    const container = document.getElementById('roadmap-steps');
    const loading = document.getElementById('roadmap-loading');
    
    if(container) container.innerHTML = "";
    if(loading) loading.classList.remove('hidden');

    try {
        console.log(`>> Requesting Roadmap for: ${role}`);

        // 1. Call Server (Relative Path for Render)
        // 🔥 FIX: Variable name 'res' used everywhere for consistency
        const res = await fetch('/generate-roadmap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: role })
        });

        if (!res.ok) throw new Error("Server Error: Oracle is silent.");

        const data = await res.json();
        
        // 2. Save to History (Firestore)
        if (auth.currentUser && data.levels) {
            try {
                await addDoc(collection(db, "roadmap_history"), {
                    userId: auth.currentUser.uid,
                    role: data.role,
                    levels: data.levels, 
                    timestamp: new Date()
                });
                console.log(">> Roadmap Saved to History");
                loadRoadmapHistory(); // Update sidebar immediately
            } catch (dbError) {
                console.warn(">> History Save Failed (Check Console)", dbError);
            }
        }

        // 3. Render Cards
        renderRoadmapUI(data);

    } catch (err) {
        console.error("Roadmap Error:", err);
        if(container) {
            container.innerHTML = `
                <div style="color: #ff4444; text-align:center; padding: 20px; border: 1px solid #ff4444; margin-top: 20px;">
                    <h3>❌ QUEST FAILED</h3>
                    <p>System Error: ${err.message}</p>
                </div>`;
        }
    } finally {
        if(loading) loading.classList.add('hidden');
    }
}

// ==========================================
// 2. RENDER CARDS UI (WITH FIXED PDF COLORS) 🎨
// ==========================================
function renderRoadmapUI(data) {
    const container = document.getElementById('roadmap-steps');
    if(!container) return;
    
    container.innerHTML = "";

    if(!data.levels) return;

    // 🔥 BUTTON AREA (PDF Download Button)
    const headerHTML = `
        <div style="text-align: right; margin-bottom: 20px;">
            <button onclick="downloadRoadmap()" class="action-btn" style="background: var(--neon-blue); color: black; font-weight: bold; border: none; cursor: pointer; padding: 10px 15px; border-radius: 5px; box-shadow: 0 0 10px var(--neon-blue);">
                <i class="fas fa-file-download"></i> DOWNLOAD INTEL (PDF)
            </button>
        </div>
    `;
    container.innerHTML = headerHTML;

    // 🔥 PDF CONTENT WRAPPER (Ispe Hardcode Color Lagayenge)
    const wrapper = document.createElement('div');
    wrapper.id = 'roadmap-content-area';
    // Dark Background forced for PDF
    wrapper.style.cssText = "padding: 30px; background-color: #050505; color: #ffffff; border-radius: 8px;";
    
    // Logo/Header inside PDF
    wrapper.innerHTML = `
        <div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #333; padding-bottom:10px;">
            <h1 style="color:#00eaff; font-family:sans-serif; margin:0; text-transform: uppercase;">HUNTER MISSION: ${data.role || 'Unknown'}</h1>
            <p style="color:#888; font-size:0.9rem; margin-top: 5px;">CONFIDENTIAL INTEL REPORT</p>
        </div>
    `;

    // CARDS GENERATION
    data.levels.forEach((level) => {
        let rankColor = "#00eaff"; // Neon Blue
        if(level.rank.includes("S-RANK")) rankColor = "#ffd700"; // Gold
        if(level.rank.includes("B-RANK")) rankColor = "#ff0055"; // Red/Pink
        if(level.rank.includes("E-RANK")) rankColor = "#aaaaaa"; // Grey

        // Links HTML
        let linksHtml = (level.resources || []).map(r => {
            return `<div style="color:#ccc; font-size:0.85rem; margin-bottom:4px; font-family: monospace;">🔗 ${r.name}</div>`;
        }).join('');

        const cardHtml = `
            <div style="background: #111; border-left: 5px solid ${rankColor}; padding: 20px; margin-bottom: 20px; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.5);">
                
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #333; padding-bottom:10px; margin-bottom:15px;">
                    <h3 style="color:${rankColor}; margin:0; font-family:sans-serif;">${level.rank}</h3>
                    <span style="color:#888; font-size:0.8rem; font-weight:bold; text-transform: uppercase;">${level.focus}</span>
                </div>

                <table style="width:100%; border-collapse:collapse; margin-bottom: 15px;">
                    <tr>
                        <td style="width:50%; vertical-align:top; padding-right:10px; border-right: 1px solid #333;">
                            <small style="color:#555; font-weight:bold; display:block; margin-bottom:5px;">⚡ REQUIRED SKILLS</small>
                            <div style="color:#fff; font-family: sans-serif;">${level.skills.join(', ')}</div>
                        </td>
                        <td style="width:50%; vertical-align:top; padding-left: 10px;">
                            <small style="color:#555; font-weight:bold; display:block; margin-bottom:5px;">📚 RESOURCES</small>
                            <div>${linksHtml || '<span style="color:#555">No Data</span>'}</div>
                        </td>
                    </tr>
                </table>

                <div style="margin-top:10px; background:rgba(255,255,255,0.05); padding:15px; border-radius:4px;">
                    <div style="color:${rankColor}; font-weight:bold; font-size:0.9rem; margin-bottom: 5px;">
                        💻 PROJECT PROTOCOL: ${level.project.title}
                    </div>
                    <div style="color:#ccc; font-size:0.85rem; line-height: 1.4;">${level.project.desc}</div>
                </div>
            </div>
        `;
        wrapper.innerHTML += cardHtml;
    });

    // Copyright Footer
    wrapper.innerHTML += `
        <div style="text-align:center; margin-top:30px; color:#444; font-size:0.7rem; border-top:1px solid #222; padding-top:10px;">
            GENERATED BY SYSTEM ORACLE • HUNTER ACADEMY
        </div>
    `;

    container.appendChild(wrapper);
}

// ==========================================
// 3. DOWNLOAD FUNCTION (FIXED) 📄
// ==========================================
window.downloadRoadmap = function() {
    const element = document.getElementById('roadmap-content-area');
    const btn = document.querySelector('.action-btn'); 

    if (!element) return alert("No Roadmap to download!");

    // UI Feedback
    let originalText = "DOWNLOAD INTEL (PDF)";
    if(btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PROCESSING...`;
    }

    // High Quality PDF Config
    const opt = {
      margin:       [0.3, 0.3, 0.3, 0.3], // Thoda kam margin
      filename:     `Hunter_Intel_Report_${Date.now()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 }, 
      html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: "#050505" // 🔥 FORCE DARK BACKGROUND
      },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    // Global html2pdf check
    if (typeof html2pdf === 'undefined') {
        alert("System Error: PDF Module not loaded. Refresh page.");
        if(btn) btn.innerHTML = originalText;
        return;
    }

    html2pdf().set(opt).from(element).save().then(() => {
        if(btn) btn.innerHTML = originalText;
        console.log("✅ PDF Downloaded");
    }).catch(err => {
        console.error("PDF Error:", err);
        alert("Failed to download PDF.");
        if(btn) btn.innerHTML = originalText;
    });
}

// ==========================================
// 4. HISTORY SYSTEM
// ==========================================
window.loadRoadmapHistory = async function() {
    if (!auth.currentUser) return;
    const historyContainer = document.getElementById('role-history-container');
    if (!historyContainer) return;

    try {
        // 🔥 Using Index here (Make sure index is created in Firebase)
        const q = query(
            collection(db, "roadmap_history"), 
            where("userId", "==", auth.currentUser.uid),
            orderBy("timestamp", "desc")
        );
        
        const snapshot = await getDocs(q);
        historyContainer.innerHTML = "";

        if(snapshot.empty) {
            historyContainer.innerHTML = "<p style='color:#666; font-size:0.8rem; text-align:center;'>No Missions Yet</p>";
            return;
        }

        snapshot.forEach(doc => {
            const item = doc.data();
            const btn = document.createElement('button');
            btn.className = "history-chip"; // CSS class honi chahiye
            btn.style.cssText = "display:block; width:100%; padding:8px; margin-bottom:5px; background:#1a1a1a; border:1px solid #333; color:#aaa; cursor:pointer; text-align:left; border-radius:4px;";
            btn.innerHTML = `<i class="fas fa-history" style="color:var(--neon-blue)"></i> ${item.role}`;
            
            // Hover effect logic
            btn.onmouseover = () => { btn.style.borderColor = "#00eaff"; btn.style.color = "#fff"; };
            btn.onmouseout = () => { btn.style.borderColor = "#333"; btn.style.color = "#aaa"; };

            btn.onclick = () => renderRoadmapUI(item);
            historyContainer.appendChild(btn);
        });
    } catch (e) { 
        console.error("History Load Error:", e); 
    }
}

// Initial Load
setTimeout(() => {
    if(auth.currentUser) loadRoadmapHistory();
}, 2000);