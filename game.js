const canvas = document.getElementById('stringCanvas');
const ctx = canvas.getContext('2d');
const board = document.getElementById('board');

// --- GAME STATE VARIABLES ---
let connections = []; // [['idA', 'idB', 'label']]
let activeCard = null;
let activePin = null;
let offsetX = 0, offsetY = 0;
let prevX = 0, prevY = 0;
const maxTilt = 10;

// --- UNIVERSAL CASE DATA ---
const caseData = {
    clues: [
        { id: "suspect_john", type: "suspect", title: "John Doe", img: "https://via.placeholder.com/100x120?text=John+Doe", desc: "Alibi doesn't check out for Tuesday night.", unlocked: true },
        { id: "weapon_knife", type: "evidence", title: "Bloody Knife", img: "https://via.placeholder.com/100x120?text=Knife", desc: "Found in the alleyway behind the theater.", unlocked: true },
        { id: "motive_will", type: "document", title: "The Last Will", img: "https://via.placeholder.com/100x120?text=The+Will", desc: "John was completely cut out of the inheritance.", unlocked: false },
        { id: "secret_partner", type: "suspect", title: "Jane Vance", img: "https://via.placeholder.com/100x120?text=Jane+Vance", desc: "An anonymous informant says she was seen fleeing with John.", unlocked: false }
    ],
    triggers: [
        {
            connects: ["suspect_john", "weapon_knife"],
            unlocks: "motive_will",
            message: "📢 LOG UPDATE: Connecting John to the weapon led the team to search his apartment. They recovered a hidden document!"
        },
        {
            connects: ["weapon_knife", "motive_will"],
            unlocks: "secret_partner",
            message: "📢 LOG UPDATE: Forensic analysis on the knife handle found traces of a second DNA profile matching a Jane Vance."
        }
    ],
    solution: [
        ["suspect_john", "weapon_knife"],
        ["suspect_john", "motive_will"],
        ["motive_will", "secret_partner"]
    ]
};

// --- CANVAS RESIZE FLOW ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawStrings();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- CARD DRAGGING MECHANICS ---
board.addEventListener('mousedown', (e) => {
    const card = e.target.closest('.clue-card');
    if (card && !e.target.classList.contains('pin')) {
        activeCard = card;
        activeCard.classList.add('grabbing');
        
        offsetX = e.clientX - activeCard.offsetLeft;
        offsetY = e.clientY - activeCard.offsetTop;
        
        prevX = e.clientX;
        prevY = e.clientY;
        activeCard.style.zIndex = "1000"; 
    }
});

window.addEventListener('mousemove', (e) => {
    if (activeCard) {
        activeCard.style.left = `${e.clientX - offsetX}px`;
        activeCard.style.top = `${e.clientY - offsetY}px`;

        const deltaX = e.clientX - prevX;
        const tilt = Math.max(-maxTilt, Math.min(maxTilt, deltaX / 2));
        activeCard.style.transform = `rotate(${tilt}deg)`;

        prevX = e.clientX;
        prevY = e.clientY;
        drawStrings();
    }
});

window.addEventListener('mouseup', () => {
    if (activeCard) {
        activeCard.classList.remove('grabbing');
        activeCard.style.transform = `rotate(0deg)`;
        activeCard.style.zIndex = "2"; 
        activeCard = null;
        saveGameState();
    }
});

// --- CONNECTIONS AND EVALUATIONS ---
board.addEventListener('click', (e) => {
    if (e.target.classList.contains('pin')) {
        const pinId = e.target.getAttribute('data-id');

        if (!activePin) {
            activePin = pinId;
            e.target.style.transform = "scale(1.4)";
        } else {
            if (activePin !== pinId) {
                const basePin = document.querySelector(`[data-id="${activePin}"]`);
                if (basePin) basePin.style.transform = "scale(1)";

                const alreadyConnected = connections.some(c => 
                    (c[0] === activePin && c[1] === pinId) || (c[0] === pinId && c[1] === activePin)
                );

                if (!alreadyConnected) {
                    connections.push([activePin, pinId, ""]);
                    drawStrings();
                    evaluateBoardState();
                }
            }
            activePin = null;
        }
    }
});

function isConnected(id1, id2) {
    return connections.some(conn => 
        (conn[0] === id1 && conn[1] === id2) || (conn[0] === id2 && conn[1] === id1)
    );
}

function evaluateBoardState() {
    caseData.triggers.forEach(trigger => {
        const targetClue = caseData.clues.find(c => c.id === trigger.unlocks);
        if (isConnected(trigger.connects[0], trigger.connects[1]) && !targetClue.unlocked) {
            unlockNewClue(trigger.unlocks);
            showNarrativeNotification(trigger.message);
        }
    });

    const caseSolved = caseData.solution.every(pair => isConnected(pair[0], pair[1]));
    if (caseSolved) {
        triggerVictory();
    }
    saveGameState();
}

// --- DRAWING STRINGS LOOP ---
function drawStrings() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    connections.forEach(pair => {
        const pin1 = document.querySelector(`[data-id="${pair[0]}"]`);
        const pin2 = document.querySelector(`[data-id="${pair[1]}"]`);

        if (pin1 && pin2) {
            const rect1 = pin1.getBoundingClientRect();
            const rect2 = pin2.getBoundingClientRect();

            const x1 = rect1.left + rect1.width / 2;
            const y1 = rect1.top + rect1.height / 2;
            const x2 = rect2.left + rect2.width / 2;
            const y2 = rect2.top + rect2.height / 2;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = '#d62828';
            ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 3;
            ctx.stroke();

            if (pair[2]) {
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                ctx.save();
                ctx.shadowColor = "transparent";
                ctx.fillStyle = "#f4edd2";
                ctx.font = `italic 12px Courier New`;
                const textWidth = ctx.measureText(pair[2]).width;
                ctx.fillRect(midX - textWidth/2 - 5, midY - 10, textWidth + 10, 20);
                ctx.fillStyle = "#3d2a1a";
                ctx.fillText(pair[2], midX - textWidth/2, midY + 4);
                ctx.restore();
            }
        }
    });
}

// --- CASE DRAWER NAVIGATION ---
const drawer = document.getElementById('case-drawer');
const toggleBtn = document.getElementById('drawer-toggle');
const intelList = document.getElementById('intel-list');
const unreadCount = document.getElementById('unread-count');

toggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('drawer-open');
});

function renderDrawer() {
    intelList.innerHTML = "";
    let availableCount = 0;

    caseData.clues.forEach(clue => {
        if (clue.unlocked && !document.getElementById(clue.id)) {
            availableCount++;
            const li = document.createElement('li');
            li.className = 'intel-item';
            li.innerHTML = `
                <strong>${clue.title}</strong>
                <p style="font-size:11px; margin:5px 0;">New evidence available.</p>
                <button class="pin-btn" data-clueid="${clue.id}">📌 Pin to Board</button>
            `;
            intelList.appendChild(li);
        }
    });

    unreadCount.innerText = availableCount;
}

intelList.addEventListener('click', (e) => {
    if (e.target.classList.contains('pin-btn')) {
        const clueId = e.target.getAttribute('data-clueid');
        spawnClueOnBoard(clueId);
    }
});

function spawnClueOnBoard(clueId) {
    const clue = caseData.clues.find(c => c.id === clueId);
    if (!clue) return;

    const card = document.createElement('div');
    card.className = 'clue-card';
    card.id = clue.id;
    
    // Centers the card cleanly directly on view coordinates
    card.style.left = `${window.innerWidth / 2 - 60}px`;
    card.style.top = `${window.innerHeight / 2 - 70}px`;

    card.innerHTML = `
        <div class="pin" data-id="${clue.id}"></div>
        <img src="${clue.img}" onerror="this.src='https://via.placeholder.com/100x120?text=CLUE'">
        <p>${clue.title}</p>
    `;

    board.appendChild(card);
    renderDrawer();
    saveGameState();
    drawStrings();
}

function unlockNewClue(clueId) {
    const clue = caseData.clues.find(c => c.id === clueId);
    if (clue) {
        clue.unlocked = true;
        renderDrawer();
    }
}

function showNarrativeNotification(text) {
    const banner = document.createElement('div');
    banner.className = 'narrative-banner';
    banner.innerText = text;
    document.body.appendChild(banner);
    setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 500);
    }, 6000);
}

// --- CONTEXT MENUS & MODALS ---
board.addEventListener('contextmenu', (e) => {
    e.preventDefault(); 
    if (e.target.classList.contains('pin')) {
        const pinId = e.target.getAttribute('data-id');
        connections = connections.filter(pair => pair[0] !== pinId && pair[1] !== pinId);
        drawStrings();
        saveGameState();
    }
});

const modal = document.getElementById('inspectorModal');
const closeModal = document.querySelector('.close-btn');

board.addEventListener('dblclick', (e) => {
    const card = e.target.closest('.clue-card');
    if (card) {
        const clueInfo = caseData.clues.find(c => c.id === card.id);
        if (clueInfo) {
            document.getElementById('inspectTitle').innerText = clueInfo.title;
            document.getElementById('inspectImg').src = clueInfo.img;
            document.getElementById('inspectDesc').innerText = clueInfo.desc;
            modal.classList.remove('hidden');
        }
    }
});
closeModal.addEventListener('click', () => modal.classList.add('hidden'));

// String connection typing labels
const labelModal = document.getElementById('stringLabelModal');
const labelInput = document.getElementById('stringLabelInput');
const saveLabelBtn = document.getElementById('saveStringLabel');
let currentEditingStringIndex = -1;

canvas.addEventListener('dblclick', (e) => {
    if (connections.length > 0) {
        currentEditingStringIndex = connections.length - 1;
        labelInput.value = connections[currentEditingStringIndex][2] || "";
        labelModal.classList.remove('hidden');
    }
});
saveLabelBtn.addEventListener('click', () => {
    if (currentEditingStringIndex !== -1) {
        connections[currentEditingStringIndex][2] = labelInput.value;
        labelModal.classList.add('hidden');
        currentEditingStringIndex = -1;
        drawStrings();
        saveGameState();
    }
});
document.getElementById('closeLabelBtn').addEventListener('click', () => labelModal.classList.add('hidden'));

// --- LOCAL STORAGE FLOW ---
function saveGameState() {
    const boardState = {
        connections: connections,
        cluesUnlocked: caseData.clues.map(c => ({ id: c.id, unlocked: c.unlocked })),
        cardPositions: caseData.clues.map(clue => {
            const el = document.getElementById(clue.id);
            return el ? { id: clue.id, left: el.style.left, top: el.style.top } : null;
        }).filter(Boolean)
    };
    localStorage.setItem('red_string_savefile', JSON.stringify(boardState));
}

function loadGameState() {
    const savedData = localStorage.getItem('red_string_savefile');
    if (!savedData) return;
    const parsed = JSON.parse(savedData);
    connections = parsed.connections;

    parsed.cluesUnlocked.forEach(savedClue => {
        const matchingClue = caseData.clues.find(c => c.id === savedClue.id);
        if (matchingClue) matchingClue.unlocked = savedClue.unlocked;
    });

    document.querySelectorAll('.clue-card').forEach(el => el.remove());
    parsed.cardPositions.forEach(pos => {
        const clue = caseData.clues.find(c => c.id === pos.id);
        if (clue) {
            const card = document.createElement('div');
            card.className = 'clue-card';
            card.id = clue.id;
            card.style.left = pos.left;
            card.style.top = pos.top;
            card.innerHTML = `
                <div class="pin" data-id="${clue.id}"></div>
                <img src="${clue.img}" onerror="this.src='https://via.placeholder.com/100x120?text=CLUE'">
                <p>${clue.title}</p>
            `;
            board.appendChild(card);
        }
    });
    renderDrawer();
    setTimeout(drawStrings, 100);
}

// Boot up game engine setup
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('red_string_savefile')) {
        loadGameState();
    } else {
        renderDrawer();
    }
});

function triggerVictory() {
    document.getElementById('victoryOverlay').classList.remove('hidden');
    activeCard = null;
    activePin = null;
}

document.getElementById('resetGameBtn').addEventListener('click', () => {
    localStorage.removeItem('red_string_savefile');
    window.location.reload();
});