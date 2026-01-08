document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
});

function initializeMap() {
    // 1. Get current progress from System Memory (localStorage)
    // Default is 1 (Level 1 is open)
    let currentMaxLevel = parseInt(localStorage.getItem('player_max_level')) || 1;
    
    // 2. Select all map elements
    const nodes = document.querySelectorAll('.skill-node');
    const connectors = document.querySelectorAll('.connector');

    nodes.forEach((node, index) => {
        const levelNumber = index + 1; // 1-based level
        const lockOverlay = node.querySelector('.lock-overlay');
        const connector = connectors[index]; // The line below this node

        // --- LOGIC: UNLOCKING ---
        if (levelNumber <= currentMaxLevel) {
            
            // A. Remove Lock Visuals
            node.classList.remove('locked');
            node.classList.add('unlocked');
            
            if (lockOverlay) {
                lockOverlay.style.display = 'none';
            }

            // B. Update Connector (Path Logic)
            // If this is NOT the last level unlocked, the path below it should glow
            if (levelNumber < currentMaxLevel && connector) {
                connector.classList.add('active-path');
            }

            // C. Inject "ENTER" Button if missing
            // (Locked nodes in HTML didn't have buttons, so we add them dynamically)
            let actionBtn = node.querySelector('.enter-btn');
            
            if (!actionBtn) {
                actionBtn = document.createElement('button');
                actionBtn.className = 'enter-btn';
                actionBtn.innerText = 'ENTER DUNGEON';
                
                // Insert button into the node (right side)
                node.appendChild(actionBtn);
            }

            // D. Set Button Action
            actionBtn.onclick = () => {
                enterLevel(levelNumber);
            };

            // E. Status Text Update
            const statusText = node.querySelector('.node-info p');
            if (statusText) {
                if (levelNumber < currentMaxLevel) {
                    statusText.innerHTML = '<span style="color:#00ff00">COMPLETED</span>';
                } else {
                    statusText.innerHTML = '<span class="status-active">Ready to Start</span>';
                }
            }

        } else {
            // --- LOGIC: LOCKING ---
            // Ensure locked state persists for future levels
            node.classList.add('locked');
            node.classList.remove('unlocked');
            
            if (lockOverlay) {
                lockOverlay.style.display = 'flex';
            }
            
            // Ensure connector is grey
            if (connector) {
                connector.classList.remove('active-path');
            }
        }
    });
}

// --- FUNCTION TO ENTER LEVEL ---
function enterLevel(level) {
    // In a real app, this redirects to the specific file
    // For now, we simulate the environment
    console.log(`System: Entering Level ${level}...`);
    
    // Example redirection logic:
    // window.location.href = `level-${level}.html`;
    
    alert(`⚔️ SYSTEM MESSAGE ⚔️\n\nEntering Dungeon: Level ${level}\nPrepare yourself!`);
}

// --- DEV TOOL: SIMULATE COMPLETION ---
// Call this function in your browser console: completeCurrentLevel()
// It simulates finishing the current highest level and unlocking the next.
window.completeCurrentLevel = function() {
    let current = parseInt(localStorage.getItem('player_max_level')) || 1;
    
    // Increase Level
    let nextLevel = current + 1;
    localStorage.setItem('player_max_level', nextLevel);
    
    alert(`🎉 QUEST COMPLETE! 🎉\n\nLevel ${current} Cleared.\nUnlocking Level ${nextLevel}...`);
    
    // Reload map to see changes
    location.reload();
};