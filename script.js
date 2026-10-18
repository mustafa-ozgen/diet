/* ========================================
   DIYET PROGRAMI - Script.js
   JSON otomatik güncelleme + PWA desteği
   ======================================== */

const JSON_FILES = [
    'diet_jsons/dietprogram1.json',
    'diet_jsons/dietprogram2.json',
    'diet_jsons/dietprogram3_fatburn.json'
];

const PROGRAM_MAP = {
    'dietprogram1': 'diet_jsons/dietprogram1.json',
    'dietprogram2': 'diet_jsons/dietprogram2.json',
    'dietprogram3_fatburn': 'diet_jsons/dietprogram3_fatburn.json'
};

let currentProgram = 'dietprogram1';
let cachedData = {};
let refreshInterval = 30000;

// DOM Elements
const programSelect = document.getElementById('programSelect');
const dietContainer = document.getElementById('dietContainer');
const refreshBtn = document.getElementById('refreshBtn');
const lastUpdatedEl = document.getElementById('lastUpdated');

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    loadAllPrograms();
    setupEventListeners();
    startAutoRefresh();
    registerServiceWorker();
    checkPWAInstall();
});

function setupEventListeners() {
    programSelect.addEventListener('change', (e) => {
        currentProgram = e.target.value;
        renderProgram(currentProgram);
    });

    refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('refreshing');
        loadAllPrograms().then(() => {
            renderProgram(currentProgram);

// ========================================
// DATA LOADING
// ========================================

async function loadAllPrograms() {
    const promises = JSON_FILES.map(async (file) => {
        try {
            const response = await fetch(file + '?t=' + Date.now(), {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            if (response.ok) {
                const data = await response.json();
                cachedData[file] = data;
                return { file, data, success: true };
            }
            return { file, success: false };
        } catch (error) {
            console.error(`Hata: ${file} yüklenemedi`, error);
            return { file, success: false };
        }
    });

    const results = await Promise.all(promises);
    updateLastUpdated();
    return results;
}

async function loadProgram(programKey) {
    const file = PROGRAM_MAP[programKey];
    if (!file) return null;

    if (cachedData[file]) {
        return cachedData[file];
    }

    try {

// ========================================
// RENDERING
// ========================================

function renderProgram(programKey) {
    const file = PROGRAM_MAP[programKey];
    const data = cachedData[file];

    if (!data) {
        dietContainer.innerHTML = `
            <div class="empty-state">
                <p>Program verisi yüklenemedi. Lütfen tekrar deneyin.</p>
                <button onclick="location.reload()" style="background: var(--primary-color); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Yeniden Yükle</button>
            </div>
        `;
        return;
    }

    const program = data.programs?.[0];
    if (!program) {
        dietContainer.innerHTML = '<div class="empty-state"><p>Geçerli diyet programı bulunamadı.</p></div>';
        return;
    }

    const programHTML = `
        <div class="program-info">
            <h2>📋 ${escapeHtml(program.name)}</h2>
            <p>Günlük diyet planınızı aşağıdan görüntüleyebilirsiniz.</p>
        </div>
    `;

    const mealsHTML = program.meals.map((meal, index) => {
        const optionsHTML = meal.options.map((option, optIndex) => {
            const contentItems = option.content.map(item => {
                const escaped = escapeHtml(item).replace(/<br\s*\/?>/gi, '<br>');
                return `<li>${escaped}</li>`;
            }).join('');

            const notesHTML = option.notes
// ========================================
// AUTO REFRESH (JSON değişikliği kontrolü)
// ========================================

function startAutoRefresh() {
    setInterval(async () => {
        try {
            const results = await loadAllPrograms();
            const currentFile = PROGRAM_MAP[currentProgram];
            const result = results.find(r => r.file === currentFile);
            
            if (result && result.success) {
                const newData = result.data;
                const oldData = cachedData[currentFile];
                
                if (JSON.stringify(newData) !== JSON.stringify(oldData)) {
                    cachedData[currentFile] = newData;
                    renderProgram(currentProgram);
                    showToast('Diyet programı güncellendi 🔄');
                }
            }
        } catch (error) {
            console.log('Otomatik yenileme hatası:', error);
        }
    }, refreshInterval);
}

// ======================================== 
// PWA & SERVICE WORKER
// ========================================

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker başarıyla kaydedildi:', registration);
        } catch (error) {
            console.log('Service Worker kaydı başarısız:', error);
        }
    }
// ========================================
// UTILITIES
// ========================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateLastUpdated() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    lastUpdatedEl.textContent = `Son güncelleme: ${timeStr}`;
}

function showToast(message) {
    let toast = document.querySelector('.update-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'update-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

programSelect.value = currentProgram;
}

let deferredPrompt;

function checkPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        const installPrompt = document.createElement('div');
        installPrompt.className = 'install-prompt';
        installPrompt.innerHTML = `
            <p>📱 Bu uygulamayı telefona yüklemek ister misiniz?</p>
            <button class="install-btn" id="installBtn">Yükle</button>
            <button class="close-install" id="closeInstall">✕</button>
        `;
        document.body.appendChild(installPrompt);

        document.getElementById('installBtn').addEventListener('click', async () => {
            installPrompt.classList.remove('show');
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const choiceResult = await deferredPrompt.userChoice;
                if (choiceResult.outcome === 'accepted') {
                    console.log('Kullanıcı uygulamayı kabul etti');
                }
                deferredPrompt = null;
            }
        });

        document.getElementById('closeInstall').addEventListener('click', () => {
            installPrompt.classList.remove('show');
        });

        setTimeout(() => {
            installPrompt.classList.add('show');
        }, 3000);
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA başarıyla yüklendi');
        deferredPrompt = null;
    });
}
                ? `<div class="notes-box">${escapeHtml(option.notes).replace(/<br\s*\/?>/gi, '<br>')}</div>`
                : '';

            return `
                <div class="options-group">
                    <div class="option-type">${escapeHtml(option.type)}</div>
                    <ul class="content-list">${contentItems}</ul>
                    ${notesHTML}
                </div>
            `;
        }).join('');

        const timeBefore = meal.time_before
            ? `<div class="meal-time">⏱ ${escapeHtml(meal.time_before)}</div>`
            : '';

        return `
            <div class="meal-card" style="animation-delay: ${index * 0.08}s">
                <div class="meal-header">
                    <div class="meal-name">🍽 ${escapeHtml(meal.name)}</div>
                </div>
                <div class="meal-content">
                    ${timeBefore}
                    ${optionsHTML}
                </div>
            </div>
        `;
    }).join('');

    dietContainer.innerHTML = programHTML + mealsHTML;
}
        const response = await fetch(file + '?t=' + Date.now(), {
            cache: 'no-cache'
        });
        if (response.ok) {
            const data = await response.json();
            cachedData[file] = data;
            return data;
        }
    } catch (error) {
        console.error(`Hata: ${file} yüklenemedi`, error);
    }
    return null;
}
            refreshBtn.classList.remove('refreshing');
            showToast('Veriler güncellendi ✓');
        });
    });
}