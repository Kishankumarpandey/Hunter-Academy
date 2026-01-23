import { db, auth, collection, addDoc, query, where, getDocs, orderBy } from "./firebase-config.js";

// ==========================================
// 1. GENERATE & SAVE ROADMAP
// ==========================================
window.fetchRoadmap = async function() {
    const roleInput = document.getElementById('role-input');
    const role = roleInput.value.trim();
    
    if (!role) return alert("Enter a Job Role!");

    const container = document.getElementById('roadmap-steps');
    const loading = document.getElementById('roadmap-loading');
    
    container.innerHTML = "";
    loading.classList.remove('hidden');

    try {
        // 1. Call Server
        const res = await fetch('http://localhost:3001/generate-roadmap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: role })
        });

        const data = await res.json();
        
        // 2. Save to History
        if (auth.currentUser && data.levels) {
            await addDoc(collection(db, "roadmap_history"), {
                userId: auth.currentUser.uid,
                role: data.role,
                levels: data.levels, 
                timestamp: new Date()
            });
            loadRoadmapHistory(); 
        }

        // 3. Render Cards
        renderRoadmapUI(data);

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="color:red; text-align:center;">SYSTEM ERROR: ${err.message}</div>`;
    } finally {
        loading.classList.add('hidden');
    }
}

// ==========================================
// 2. RENDER CARDS UI (WITH FIXED PDF COLORS) 🎨
// ==========================================
function renderRoadmapUI(data) {
    const container = document.getElementById('roadmap-steps');
    container.innerHTML = "";

    if(!data.levels) return;

    // 🔥 BUTTON AREA (Isse PDF se bahar rakhenge)
    const headerHTML = `
        <div style="text-align: right; margin-bottom: 20px;">
            <button onclick="downloadRoadmap()" class="action-btn" style="background: var(--neon-blue); color: black; font-weight: bold; border: none; cursor: pointer; padding: 10px 15px; border-radius: 5px;">
                <i class="fas fa-file-download"></i> DOWNLOAD INTEL (PDF)
            </button>
        </div>
    `;
    container.innerHTML = headerHTML;

    // 🔥 PDF CONTENT WRAPPER (Ispe Hardcode Color Lagayenge)
    // Background: #050505 (Dark Black) | Text: White
    const wrapper = document.createElement('div');
    wrapper.id = 'roadmap-content-area';
    wrapper.style.cssText = "padding: 30px; background-color: #050505; color: #ffffff; border-radius: 8px;";
    
    // Logo/Header inside PDF
    wrapper.innerHTML = `
        <div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #333; padding-bottom:10px;">
            <h1 style="color:#00eaff; font-family:sans-serif; margin:0;">HUNTER MISSION: ${data.role || 'Unknown'}</h1>
            <p style="color:#888; font-size:0.9rem;">CONFIDENTIAL INTEL REPORT</p>
        </div>
    `;

    // CARDS GENERATION
    data.levels.forEach((level, index) => {
        let rankColor = "#00eaff"; // Neon Blue (Fixed Hex for PDF)
        if(level.rank.includes("S-RANK")) rankColor = "#ffd700"; // Gold
        if(level.rank.includes("E-RANK")) rankColor = "#aaaaaa"; // Grey

        // Links HTML
        let linksHtml = (level.resources || []).map(r => {
            return `<div style="color:#ccc; font-size:0.85rem; margin-bottom:4px;">🔗 ${r.name}</div>`;
        }).join('');

        const cardHtml = `
            <div style="background: #111; border-left: 5px solid ${rankColor}; padding: 20px; margin-bottom: 20px; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #333; padding-bottom:10px; margin-bottom:15px;">
                    <h3 style="color:${rankColor}; margin:0; font-family:sans-serif;">${level.rank}</h3>
                    <span style="color:#888; font-size:0.8rem; font-weight:bold;">${level.focus}</span>
                </div>

                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="width:50%; vertical-align:top; padding-right:10px;">
                            <small style="color:#555; font-weight:bold; display:block; margin-bottom:5px;">⚡ REQUIRED SKILLS</small>
                            <div style="color:#fff;">${level.skills.join(', ')}</div>
                        </td>
                        <td style="width:50%; vertical-align:top;">
                            <small style="color:#555; font-weight:bold; display:block; margin-bottom:5px;">📚 RESOURCES</small>
                            <div>${linksHtml || '<span style="color:#555">No Data</span>'}</div>
                        </td>
                    </tr>
                </table>

                <div style="margin-top:15px; background:rgba(255,255,255,0.05); padding:10px; border-radius:4px;">
                    <div style="color:${rankColor}; font-weight:bold; font-size:0.9rem;">
                        💻 PROJECT: ${level.project.title}
                    </div>
                    <div style="color:#aaa; font-size:0.85rem; margin-top:3px;">${level.project.desc}</div>
                </div>
            </div>
        `;
        wrapper.innerHTML += cardHtml;
    });

    // Copyright Footer
    wrapper.innerHTML += `
        <div style="text-align:center; margin-top:30px; color:#444; font-size:0.7rem; border-top:1px solid #222; padding-top:10px;">
            GENERATED BY SYSTEM ORACLE • HUNTER ASSOCIATION
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

    // UI Feedback
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PROCESSING...`;

    // High Quality PDF Config
    const opt = {
      margin:       [0.5, 0.5, 0.5, 0.5],
      filename:     `Hunter_Intel_Report.pdf`,
      image:        { type: 'jpeg', quality: 0.98 }, // Best Image Quality
      html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: "#050505" // 🔥 FORCE DARK BACKGROUND
      },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        btn.innerHTML = originalText;
        alert("✅ INTEL SECURED (PDF DOWNLOADED)");
    });
}
// ==========================================
// 4. HISTORY SYSTEM
// ==========================================
window.loadRoadmapHistory = async function() {
    if (!auth.currentUser) return;
    const historyContainer = document.getElementById('role-history-container');
    
    try {
        const q = query(
            collection(db, "roadmap_history"), 
            where("userId", "==", auth.currentUser.uid),
            orderBy("timestamp", "desc")
        );
        const snapshot = await getDocs(q);
        historyContainer.innerHTML = "";

        snapshot.forEach(doc => {
            const item = doc.data();
            const btn = document.createElement('button');
            btn.className = "history-chip";
            btn.innerHTML = `<i class="fas fa-history"></i> ${item.role}`;
            btn.onclick = () => renderRoadmapUI(item);
            historyContainer.appendChild(btn);
        });
    } catch (e) { console.error(e); }
}

// Initial Load
setTimeout(loadRoadmapHistory, 2000);