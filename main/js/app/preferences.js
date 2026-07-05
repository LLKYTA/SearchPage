/* ==========================================
   settings.js - 设置弹窗、热榜来源、背景、词库
   ========================================== */

// ========== 设置弹窗 ==========
function openSettings() {
    document.getElementById('settings-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// ========== 热榜来源 ==========
function saveHotboardSource() {
    const select = document.getElementById('hotboard-source-select');
    if (select) {
        localStorage.setItem('hotboard-source', select.value);
        const area = WidgetFramework.areas.get('main-area');
        if (area) {
            area.widgets.forEach(w => {
                if (w instanceof HotboardWidget) w.onUpdate();
            });
        }
    }
}

// ========== 背景 ==========
function setBackground(type, el) {
    document.querySelectorAll('.bg-option').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    localStorage.setItem('background', type);
}

// ========== 每日单词词库 ==========
function saveDailyWordCategory() {
    const select = document.getElementById('dailyword-category-select');
    if (!select) return;
    localStorage.setItem('dailyword-category', select.value);
    const area = WidgetFramework.areas.get('main-area');
    if (area) {
        area.widgets.forEach(w => {
            if (w instanceof DailyWordWidget) w.onUpdate();
        });
    }
}

function loadDailyWordCategory() {
    const saved = localStorage.getItem('dailyword-category') || 'all';
    const select = document.getElementById('dailyword-category-select');
    if (select) select.value = saved;
}

function closeWidgetGallery() {
    document.getElementById('widget-gallery-modal').classList.remove('active');
    document.body.style.overflow = '';
}
