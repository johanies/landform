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
    const button = document.querySelector('.mode-toggle');
    if (!button) return;

    button.addEventListener('click', () => {
        toggleNightMode();
    });
}

function initTextReveal() {
    const root = document.documentElement;
    const circle = document.querySelector('.reveal-circle');
    const darkLayer = document.querySelector('.content-layer--dark');
    if (!circle || !darkLayer) return;

    const defaultRadius = 140;
    root.style.setProperty('--reveal-radius', defaultRadius + 'px');

    const isCoarsePointer = window.matchMedia &&
        window.matchMedia('(pointer: coarse)').matches;

    const updateAtPosition = (x, y) => {
        // pozice kruhu (fixed, v souřadnicích viewportu)
        root.style.setProperty('--reveal-x', x + 'px');
        root.style.setProperty('--reveal-y', y + 'px');

        // pozice clip-path vzhledem k textové vrstvě
        const rect = darkLayer.getBoundingClientRect();
        const localX = x - rect.left;
        const localY = y - rect.top;
        darkLayer.style.setProperty('--reveal-x', localX + 'px');
        darkLayer.style.setProperty('--reveal-y', localY + 'px');
    };

    if (isCoarsePointer) {
        // Touch zařízení – autonomní „screensaver“ pohyb
        // startujeme ze středu tmavé vrstvy, aby se pohyb držel víc nad textem
        const rect = darkLayer.getBoundingClientRect();
        let x = rect.left + rect.width / 2;
        let y = rect.top + rect.height / 2;

        // na mobilech menší kruh, aby nepůsobil tak masivně
        const radius = window.innerWidth < 600 ? 90 : defaultRadius;
        root.style.setProperty('--reveal-radius', radius + 'px');

        // směr trochu náhodný, ať to neběží „učebnicově“ po diagonále
        const speed = 4;
        const angle = Math.random() * Math.PI * 2;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;

        const tick = () => {
            // omezíme pohyb kruhu na oblast tmavé vrstvy,
            // aby se neusekával o její okraj
            const rect = darkLayer.getBoundingClientRect();
            const minX = rect.left + radius;
            const maxX = rect.right - radius;
            const minY = rect.top + radius;
            const maxY = rect.bottom - radius;

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
    const label = document.querySelector('.top__countdown');
    if (!label) return;

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

        label.textContent = formatTimeLeft(diff);
    };

    tick();
    setInterval(tick, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    initModeToggle();
    initCountdown();
    initTextReveal();
});

