/* ===== DIYET PROGRAMI - uygulama mantigi (1/2) ===== */
const FILES = ['diet_jsons/dietprogram1.json', 'diet_jsons/dietprogram2.json', 'diet_jsons/dietprogram3_fatburn.json'];
const MAP = { dietprogram1: FILES[0], dietprogram2: FILES[1], dietprogram3_fatburn: FILES[2] };
let current = 'dietprogram1';
let cache = {};
const sel = document.getElementById('programSelect');
const box = document.getElementById('dietContainer');
const refreshBtn = document.getElementById('refreshBtn');
const lastUpd = document.getElementById('lastUpdated');

document.addEventListener('DOMContentLoaded', () => {
    sel.value = current;
    sel.addEventListener('change', () => { current = sel.value; render(current); });
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
function render(key) {
    const data = cache[MAP[key]];
    if (!data || !data.programs || !data.programs[0]) {
        box.innerHTML = '<div class="empty-state"><p>Program verisi yüklenemedi.</p></div>';
        return;
    }
    const p = data.programs[0];
    let html = '<div class="program-info"><h2>' + esc(p.name) + '</h2><p>Günlük diyet planınızı aşağıdan görüntüleyebilirsiniz.</p></div>';
    p.meals.forEach((m, i) => {
        html += '<div class="meal-card" style="animation-delay:' + (i * 0.07) + 's"><div class="meal-header"><div class="meal-name">' + esc(m.name) + '</div>';
        if (m.time_before) html += '<span class="meal-time">' + esc(m.time_before) + '</span>';
        html += '</div><div class="meal-content">';
        m.options.forEach((o) => {
            html += '<div class="options-group"><div class="option-type">' + esc(o.type) + '</div><ul class="content-list">';
            o.content.forEach((c) => { html += '<li>' + br(c) + '</li>'; });
            html += '</ul>';
            if (o.notes) html += '<div class="notes-box">' + br(o.notes) + '</div>';
            html += '</div>';
        });
        html += '</div></div>';
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
        p.innerHTML = '<p>Bu uygulamayı telefona yüklemek ister misiniz?</p><button class="install-btn" id="iBtn">Yükle</button><button class="close-install" id="iX">X</button>';
        document.body.appendChild(p);
        document.getElementById('iBtn').onclick = async () => { p.classList.remove('show'); if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; } };
        document.getElementById('iX').onclick = () => p.classList.remove('show');
        setTimeout(() => p.classList.add('show'), 3000);
    });
}