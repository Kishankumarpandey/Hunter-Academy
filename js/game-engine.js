let currentPairs = [];
let selectedTerm = null;
let score = 0;
let hp = 100;

async function initGame() {
    const topic = document.getElementById('game-topic').value;
    if(!topic) return alert("Topic daalo bhai!");

    document.getElementById('level-title').innerText = "🔮 CONJURING RUNES...";
    document.getElementById('game-arena').classList.remove('hidden');

    try {
        const res = await fetch('http://localhost:3001/generate-game-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topic })
        });
        
        const data = await res.json();
        renderGame(data);

    } catch (e) {
        console.error(e);
        alert("Server Error! Check Console.");
    }
}

function renderGame(data) {
    document.getElementById('level-title').innerText = data.gameTitle.toUpperCase();
    
    const termsCol = document.getElementById('col-terms');
    const defsCol = document.getElementById('col-defs');
    
    termsCol.innerHTML = "";
    defsCol.innerHTML = "";
    currentPairs = data.pairs;

    // 1. TERMS (Left Side)
    data.pairs.forEach(pair => {
        const btn = document.createElement('div');
        btn.className = 'rune-card term';
        btn.innerText = pair.term;
        btn.dataset.id = pair.id;
        btn.onclick = () => selectTerm(btn);
        termsCol.appendChild(btn);
    });

    // 2. DEFINITIONS (Right Side) - SHUFFLE KARO!
    const shuffledDefs = [...data.pairs].sort(() => Math.random() - 0.5);
    
    shuffledDefs.forEach(pair => {
        const btn = document.createElement('div');
        btn.className = 'rune-card def';
        btn.innerText = pair.def;
        btn.dataset.id = pair.id;
        btn.onclick = () => checkMatch(btn);
        defsCol.appendChild(btn);
    });
}

// GAMEPLAY LOGIC
function selectTerm(elem) {
    // Purana selection hatao
    document.querySelectorAll('.term').forEach(e => e.classList.remove('selected'));
    
    selectedTerm = elem;
    elem.classList.add('selected');
}

function checkMatch(defElem) {
    if(!selectedTerm) return; // Pehle Term select karo!

    const termId = selectedTerm.dataset.id;
    const defId = defElem.dataset.id;

    if(termId === defId) {
        // ✅ MATCHED!
        selectedTerm.classList.add('matched');
        defElem.classList.add('matched');
        selectedTerm.style.visibility = 'hidden'; // Gayab kar do
        defElem.style.visibility = 'hidden';
        
        score += 100;
        playSound('success');
        selectedTerm = null; // Reset
    } else {
        // ❌ WRONG!
        hp -= 20;
        defElem.classList.add('error');
        setTimeout(() => defElem.classList.remove('error'), 500);
        playSound('error');
    }

    updateUI();
    checkWin();
}

function updateUI() {
    document.getElementById('game-status').innerText = `HP: ${hp}% | SCORE: ${score}`;
    if(hp <= 0) alert("☠️ GAME OVER! SYSTEM FAILURE.");
}

function checkWin() {
    if(score === 500) {
        alert("🏆 DUNGEON CLEARED! +500 XP");
    }
}

function playSound(type) {
    // Baad me audio add karenge
    console.log("Sound:", type);
}