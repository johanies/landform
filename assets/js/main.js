// Základní vstupní soubor JS

// Časy přepnutí režimu v místním čase (24h formát).
// V praxi např.:
//   NIGHT_START_TIME = '00:00:00'  → přepnutí do nočního režimu o půlnoci
//   DAY_START_TIME   = '08:00:00'  → přepnutí zpět do denního režimu v 8 ráno
// Pro testování si můžeš oba časy libovolně posunout (např. o minutu dopředu).
const DAY_START_TIME = '7:00:00';   // HH:MM:SS – kdy začíná denní režim
const NIGHT_START_TIME = '22:00:00'; // HH:MM:SS – kdy začíná noční režim

function toggleNightMode() {
    document.body.classList.toggle('night');
}

function initModeToggle() {
    const buttons = document.querySelectorAll('.mode-toggle');
    if (!buttons.length) return;

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            toggleNightMode();
        });
    });
}

function initTextReveal() {
    const root = document.documentElement;
    const darkLayer = document.querySelector('.content-layer--dark');
    const shapePath = document.querySelector('#revealShapePath');
    if (!darkLayer || !shapePath) return;

    const defaultRadius = 140;
    
    // Získáme skutečný bounding box path pro výpočet středu
    const bbox = shapePath.getBBox();
    const svgCenterX = bbox.x + bbox.width / 2;
    const svgCenterY = bbox.y + bbox.height / 2;
    const svgDiameter = Math.max(bbox.width, bbox.height);
    
    root.style.setProperty('--reveal-radius', defaultRadius + 'px');

    const isCoarsePointer = window.matchMedia &&
        window.matchMedia('(pointer: coarse)').matches;

    const updateAtPosition = (x, y) => {
        // pozice tvaru (fixed, v souřadnicích viewportu)
        // kurzor je ve středu tvaru, stejně jako u kruhu
        const radius = parseFloat(getComputedStyle(root).getPropertyValue('--reveal-radius')) || defaultRadius;
        const size = radius * 2; // průměr
        
        // Scale podle velikosti - chceme aby měl stejnou velikost jako kruh
        const scale = size / svgDiameter;
        
        // Transformujeme tak, aby střed SVG byl na pozici kurzoru
        // V SVG se transformace aplikují zprava doleva: translate(x, y) scale(s) = nejprve scale, pak translate
        // Po škálování je střed na (svgCenterX * scale, svgCenterY * scale)
        // Chceme ho posunout na (x, y), takže translate = (x - svgCenterX*scale, y - svgCenterY*scale)
        const translateX = x - svgCenterX * scale;
        const translateY = y - svgCenterY * scale;
        
        shapePath.setAttribute('transform', `translate(${translateX},${translateY}) scale(${scale})`);
    };

    // Inicializace na střed obrazovky
    const initialX = window.innerWidth / 2;
    const initialY = window.innerHeight / 2;
    updateAtPosition(initialX, initialY);

    if (isCoarsePointer) {
        // Touch zařízení – autonomní „screensaver“ pohyb
        let x = initialX;
        let y = initialY;

        // na mobilech menší tvar, aby nepůsobil tak masivně
        const radius = window.innerWidth < 600 ? 90 : defaultRadius;
        root.style.setProperty('--reveal-radius', radius + 'px');
        updateAtPosition(x, y); // aktualizuj s novým radius

        // směr trochu náhodný, ať to neběží „učebnicově“ po diagonále
        const speed = 4;
        const angle = Math.random() * Math.PI * 2;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;

        const tick = () => {
            const maxX = window.innerWidth - radius;
            const minX = radius;
            const maxY = window.innerHeight - radius;
            const minY = radius;

            x += vx;
            y += vy;

            if (x < minX) {
                x = minX;
                vx *= -1;
            } else if (x > maxX) {
                x = maxX;
                vx *= -1;
            }

            if (y < minY) {
                y = minY;
                vy *= -1;
            } else if (y > maxY) {
                y = maxY;
                vy *= -1;
            }

            updateAtPosition(x, y);
            requestAnimationFrame(tick);
        };

        updateAtPosition(x, y);
        requestAnimationFrame(tick);
    } else {
        // Myš / trackpad – následuje kurzor
        window.addEventListener('mousemove', (event) => {
            updateAtPosition(event.clientX, event.clientY);
        });
    }
}
function getNextOccurrence(now, timeStr) {
    const [h = 0, m = 0, s = 0] = (timeStr || '0:0:0').split(':').map(Number);
    const date = new Date(now);
    date.setHours(h, m, s, 0);

    // když už tenhle čas dnes proběhl, bereme zítřek
    if (date.getTime() <= now.getTime()) {
        date.setDate(date.getDate() + 1);
    }

    return date;
}

function getStateAndTarget() {
    const now = new Date();

    const nextDay = getNextOccurrence(now, DAY_START_TIME);
    const nextNight = getNextOccurrence(now, NIGHT_START_TIME);

    // pokud je nejbližší přepnutí do noci, jsme teď ve dne; jinak v noci
    const inDayNow = nextNight.getTime() < nextDay.getTime();
    const nextTarget = inDayNow ? nextNight : nextDay;

    return { inDayNow, nextTarget };
}

function formatTimeLeft(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function initCountdown() {
    const labels = document.querySelectorAll('.top__countdown');
    if (!labels.length) return;

    let { inDayNow, nextTarget } = getStateAndTarget();

    // výchozí režim podle aktuálního času
    const body = document.body;
    const hasNight = body.classList.contains('night');
    if (inDayNow && hasNight) {
        body.classList.remove('night');
    } else if (!inDayNow && !hasNight) {
        body.classList.add('night');
    }

    const tick = () => {
        const now = Date.now();
        let diff = nextTarget.getTime() - now;

        if (diff <= 0) {
            diff = 0;
            toggleNightMode();
            // po přepnutí si spočítáme nový stav a další cíl
            const state = getStateAndTarget();
            inDayNow = state.inDayNow;
            nextTarget = state.nextTarget;
        }

        const timeStr = formatTimeLeft(diff);
        labels.forEach(label => {
            label.textContent = timeStr;
        });
    };

    tick();
    setInterval(tick, 1000);
}

function fixPrepositions() {
    // Seznam jednoznakových předložek v češtině
    const prepositions = ['v', 's', 'k', 'z', 'o', 'u', 'i', 'a'];
    
    // Najdeme všechny odstavce s textem
    const paragraphs = document.querySelectorAll('.content-text p');
    
    paragraphs.forEach(p => {
        let html = p.innerHTML;
        
        // Pro každou předložku nahradíme mezeru za nezlomitelnou mezeru
        prepositions.forEach(prep => {
            // Regex najde předložku následovanou mezerou a slovem
            // Použijeme word boundary, aby se to netýkalo částí slov
            const regex = new RegExp(`\\b${prep}\\s+`, 'gi');
            html = html.replace(regex, `${prep}\u00A0`); // \u00A0 je nezlomitelná mezera
        });
        
        p.innerHTML = html;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initModeToggle();
    initCountdown();
    initTextReveal();
    fixPrepositions();
});

