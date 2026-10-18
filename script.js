/* ===== DIYET PROGRAMIM - uygulama mantigi (1/2) ===== */
const FILES = ['diet_jsons/dietprogram1.json', 'diet_jsons/dietprogram2.json', 'diet_jsons/dietprogram3_fatburn.json'];
const MAP = { dietprogram1: FILES[0], dietprogram2: FILES[1], dietprogram3_fatburn: FILES[2] };
const NAMES = { dietprogram1: 'Diyet Programı 1', dietprogram2: 'Diyet Programı 2', dietprogram3_fatburn: 'Fat Burn List' };
const BADGES = { dietprogram1: '&#129382;', dietprogram2: '&#9749;', dietprogram3_fatburn: '&#128293;' };
const MEAL_ICONS = [
    { keys: ['kahvalt', 'sabah'], icon: '&#127789;' },
    { keys: ['kuşluk', 'kusluk', 'ara'], icon: '&#127861;' },
    { keys: ['öğle', 'ogle', 'oglen'], icon: '&#127860;' },
    { keys: ['ikindi'], icon: '&#129382;' },
    { keys: ['akşam', 'aksam'], icon: '&#127839;' },
    { keys: ['gece'], icon: '&#127769;' }
];
let current = 'dietprogram1';
let cache = {};
const pills = document.getElementById('programPills');
const box = document.getElementById('dietContainer');
const refreshBtn = document.getElementById('refreshBtn');
const lastUpd = document.getElementById('lastUpdated');
const programName = document.getElementById('programName');
const programMeta = document.getElementById('programMeta');
const programBadge = document.getElementById('programBadge');

document.addEventListener('DOMContentLoaded', () => {
    const d = new Date();
    document.getElementById('dateLine').textContent = d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
    pills.addEventListener('click', (e) => {
        const b = e.target.closest('.pill');
        if (!b || b.dataset.program === current) return;
        current = b.dataset.program;
        pills.querySelectorAll('.pill').forEach((p) => p.classList.toggle('active', p === b));
        render(current);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('spinning');
        loadAll().then(() => { render(current); refreshBtn.classList.remove('spinning'); toast('Veriler güncellendi'); });
    });
    loadAll().then(() => render(current));
    setInterval(checkUpdate, 30000);
    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(() => {}); }
    watchInstall();
});

async function loadAll() {
    const out = await Promise.all(FILES.map(async (f) => {
        try {
            const r = await fetch(f + '?t=' + Date.now(), { cache: 'no-store' });
            if (!r.ok) return { f: f, ok: false };
            const d = await r.json();
            cache[f] = d;
            return { f: f, ok: true, data: d };
        } catch (e) { return { f: f, ok: false }; }
    }));
    const n = new Date();
    lastUpd.textContent = 'Son güncelleme: ' + n.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return out;
}

async function checkUpdate() {
    try {
        const before = JSON.stringify(cache[MAP[current]]);
        await loadAll();
        if (JSON.stringify(cache[MAP[current]]) !== before) { render(current); toast('Diyet programı güncellendi'); }
    } catch (e) {}
}
function mealIcon(name) {
    const n = (name || '').toLocaleLowerCase('tr');
    for (const m of MEAL_ICONS) { if (m.keys.some((k) => n.indexOf(k) > -1)) return m.icon; }
    return '&#127860;';
}

function render(key) {
    const data = cache[MAP[key]];
    if (!data || !data.programs || !data.programs[0]) {
        box.innerHTML = '<div class="empty-state"><p>Program verisi yüklenemedi.</p></div>';
        return;
    }
    const p = data.programs[0];
    const title = p.name || NAMES[key];
    const meals = p.meals || [];
    programName.textContent = title;
    programMeta.textContent = meals.length + ' öğün • günlük plan';
    programBadge.innerHTML = BADGES[key] || '&#129367;';
    let html = '';
    meals.forEach((m, i) => {
        const cls = 'c' + (i % 6);
        html += '<article class="meal ' + cls + '" style="animation-delay:' + (i * 0.07) + 's">';
        html += '<div class="meal-head"><div class="meal-ico">' + mealIcon(m.name) + '</div>';
        html += '<div class="meal-title"><h3>' + esc(m.name) + '</h3>';
        if (m.time_before) html += '<span class="when">&#9200; ' + esc(m.time_before) + '</span>';
        html += '</div></div><div class="meal-body">';
        (m.options || []).forEach((o) => {
            html += '<div class="opt"><span class="opt-tag">' + esc(o.type) + '</span><ul class="food-list">';
            (o.content || []).forEach((c) => { html += '<li>' + br(c) + '</li>'; });
            html += '</ul>';
            if (o.notes) html += '<div class="note"><b>Not</b>' + br(o.notes) + '</div>';
            html += '</div>';
        });
        html += '</div></article>';
    });
    box.innerHTML = html;
}

function esc(t) { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }
function br(t) { return esc(t).replace(/&lt;br\s*\/?&gt;/gi, '<br>'); }

function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}

let deferredPrompt = null;
function watchInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); deferredPrompt = e;
        const p = document.createElement('div');
        p.className = 'install-prompt';
        p.innerHTML = '<p>Uygulamayı telefona yüklemek ister misin?</p><button class="install-btn" id="iBtn">Yükle</button><button class="close-install" id="iX">✕</button>';
        document.body.appendChild(p);
        document.getElementById('iBtn').onclick = async () => { p.classList.remove('show'); if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; } };
        document.getElementById('iX').onclick = () => p.classList.remove('show');
        setTimeout(() => p.classList.add('show'), 3000);
    });
}