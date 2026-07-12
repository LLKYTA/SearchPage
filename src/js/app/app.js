/* ==========================================
   app.js - iOS 18 核心逻辑、初始化、搜索、主题
   ========================================== */

window.currentManageWidget = null;

const CONFIG = {
    searchEngines: {
        baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
        google: { name: 'Google', url: 'https://www.google.com/search?q=' },
        bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' }
    },
    currentEngine: 'bing',
    currentTheme: 'auto'
};

// ========== 注册所有小组件 ==========
WidgetFramework.register('clock', ClockWidget);
WidgetFramework.register('weather', WeatherWidget);
WidgetFramework.register('shortcuts', ShortcutsWidget);
WidgetFramework.register('todo', TodoWidget);
WidgetFramework.register('bookmarks', BookmarksWidget);
WidgetFramework.register('hotboard', HotboardWidget);
WidgetFramework.register('time-progress', TimeProgressWidget);
WidgetFramework.register('daily-word', DailyWordWidget);

// ========== UI 组件实例 ==========
let themeSegment, bgSegment;

document.addEventListener('DOMContentLoaded', () => {
    WidgetFramework.init();
    initSearch();
    initUISegments();
    initSettingsDropdowns();
    initUIModals();
    loadSettings();
    applyTheme();

    // iOS 18 风格启动动画
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('hide');
            splash.addEventListener('transitionend', () => {
                splash.remove();
            }, { once: true });
        }, 1200); // 稍快，iOS 18 更干脆
    }
});

// ========== 搜索 ==========
function initSearch() {
    const input = document.getElementById('search-input');
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    document.getElementById('search-btn').addEventListener('click', performSearch);

    // 搜索框自动获得焦点（桌面端），类似 iOS 18 的快速搜索
    if (window.innerWidth > 768 && !/Mobi|Android/i.test(navigator.userAgent)) {
        setTimeout(() => input.focus(), 1500);
    }
}

function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (query) {
        window.open(CONFIG.searchEngines[CONFIG.currentEngine].url + encodeURIComponent(query), '_blank');
    }
}

// 引擎图标映射
const ENGINE_ICONS = {
    baidu: 'fa-search',
    google: 'fa-google',
    bing: 'fa-edge'
};

function setSearchEngine(engine) {
    CONFIG.currentEngine = engine;

    // 更新内联引擎切换钮
    const nameEl = document.getElementById('engine-inline-name');
    const iconEl = document.getElementById('engine-inline-icon');
    if (nameEl) nameEl.textContent = CONFIG.searchEngines[engine].name;
    if (iconEl) iconEl.className = 'fa ' + (ENGINE_ICONS[engine] || 'fa-search');

    // 更新下拉菜单
    document.querySelectorAll('.engine-dropdown-item').forEach(b => b.classList.remove('active'));
    const activeItem = document.querySelector(`.engine-dropdown-item[data-engine="${engine}"]`);
    if (activeItem) activeItem.classList.add('active');

    // 向后兼容：旧的 engine-btn / engine-pill
    document.querySelectorAll('.engine-btn, .engine-pill').forEach(b => b.classList.remove('active'));
    const oldByEngine = document.querySelector(`[data-engine="${engine}"]`);
    if (oldByEngine) oldByEngine.classList.add('active');

    const hint = document.getElementById('current-engine');
    if (hint) hint.textContent = CONFIG.searchEngines[engine].name;
    if (typeof engineDropdown !== 'undefined') {
        engineDropdown.setValue(engine, true);
    }
    saveSettings();
}

// ========== 初始化 UI 组件（框架） ==========
function initUISegments() {
    // 主题模式分段器
    themeSegment = new UISegment({
        el: document.getElementById('theme-segment'),
        options: [
            { value: 'light', icon: 'fa-sun-o' },
            { value: 'dark',  icon: 'fa-moon-o' },
            { value: 'auto',  icon: 'fa-desktop' }
        ],
        initialValue: CONFIG.currentTheme,
        onChange: (value) => setTheme(value)
    });

    // 背景风格分段器
    bgSegment = new UISegment({
        el: document.getElementById('bg-segment'),
        options: [
            { value: 'gradient', label: '渐变' },
            { value: 'pure',     label: '纯色' },
            { value: 'custom',   label: '自定义' }
        ],
        initialValue: localStorage.getItem('background') || 'gradient',
        onChange: (value) => setBackground(value)
    });
}

function initUIModals() {
    // 设置弹窗
    window.settingsModal = new UIModal(document.getElementById('settings-modal'), {
        closeOnOverlay: false
    });
    // 关于弹窗
    window.aboutModal = new UIModal(document.getElementById('about-modal'));
    // 管理弹窗
    window.manageModal = new UIModal(document.getElementById('manage-modal'), {
        closeOnOverlay: false
    });
    // 小组件库弹窗
    window.galleryModal = new UIModal(document.getElementById('widget-gallery-modal'), {
        closeOnOverlay: false,
        onClose: () => {
            // 清理拖拽残留的 inline 样式，确保下次打开正常
            const sheet = document.querySelector('#widget-gallery-modal .modal-bottom-sheet');
            if (sheet) {
                sheet.style.animation = '';
                sheet.style.transition = '';
                sheet.style.transform = '';
            }
        }
    });
    initGallerySwipe();
}

// ========== 底部菜单拖动关闭（小组件库） ==========
function initGallerySwipe() {
    const modal = document.getElementById('widget-gallery-modal');
    const sheet = modal.querySelector('.modal-bottom-sheet');
    const handle = modal.querySelector('.modal-header');
    if (!sheet || !handle) return;

    let startY = -1, startX = -1, lastY = -1, dragging = false;

    function onStart(e) {
        const p = e.touches ? e.touches[0] : e;
        startY = p.clientY;
        startX = p.clientX;
        lastY = p.clientY;
        dragging = false;
    }

    function onMove(e) {
        // ★ 只在弹窗打开时响应拖拽，防止全局误触
        if (!modal.classList.contains('active')) return;
        // ★ 未从 handle 发起拖拽则不响应（防止点击触发按钮后鼠标移动误触）
        if (startY === -1) return;

        const p = e.touches ? e.touches[0] : e;
        const dy = p.clientY - startY;
        const dx = Math.abs(p.clientX - startX);

        // 只有明显向下拖动才启动
        if (!dragging) {
            if (dy <= 0 || dy < dx) return;
            dragging = true;
            // 停用 CSS 动画，防止与 transform 冲突
            sheet.style.animation = 'none';
        }

        if (dy <= 0) return;
        lastY = p.clientY;

        const progress = Math.min(1, dy / 300);
        sheet.style.transform = `translateY(${dy}px)`;
        modal.style.background = `rgba(0,0,0,${0.4 * (1 - progress)})`;
        modal.style.backdropFilter = `blur(${8 * (1 - progress)}px)`;

        if (e.cancelable) e.preventDefault();
    }

    function resetDrag() {
        startY = -1;
        startX = -1;
        lastY = -1;
        dragging = false;
    }

    function onEnd() {
        if (!dragging) {
            resetDrag();
            return;
        }

        const dy = lastY - startY;
        if (dy > 100) {
            // 超过阈值 → 滑出关闭
            sheet.style.transition = 'transform 0.28s var(--spring-slide)';
            sheet.style.transform = 'translateY(100%)';
            modal.style.transition = 'background 0.28s, backdrop-filter 0.28s';
            modal.style.background = 'rgba(0,0,0,0)';
            modal.style.backdropFilter = 'blur(0px)';
            setTimeout(() => {
                window.galleryModal.close();
                cleanup();
            }, 280);
        } else {
            // 不足阈值 → 弹回
            sheet.style.transition = 'transform 0.3s var(--spring-slide)';
            sheet.style.transform = 'translateY(0)';
            modal.style.transition = 'background 0.3s, backdrop-filter 0.3s';
            modal.style.background = '';
            modal.style.backdropFilter = '';
            setTimeout(() => cleanup(), 300);
        }
    }

    function cleanup() {
        resetDrag();
        sheet.style.animation = '';
        sheet.style.transition = '';
        sheet.style.transform = '';
        modal.style.background = '';
        modal.style.backdropFilter = '';
        modal.style.transition = '';
    }

    // 触摸事件（移动端）
    handle.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);

    // 鼠标事件（桌面端）
    handle.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('mouseleave', () => { if (dragging) onEnd(); });

    // 监测 modal 关闭（Escape / 程序化调用 close() 等不触发 onEnd 的路径）
    // 只要 'active' 类被移除，就立即清理拖拽状态防止残留
    const closeObserver = new MutationObserver(() => {
        if (!modal.classList.contains('active')) {
            resetDrag();
        }
    });
    closeObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
}

// ========== 引擎下拉菜单 ==========
function toggleEngineDropdown() {
    const dropdown = document.getElementById('engine-dropdown');
    dropdown.classList.toggle('open');
}

function closeEngineDropdown() {
    document.getElementById('engine-dropdown')?.classList.remove('open');
}

// 点击外部关闭下拉菜单
document.addEventListener('click', function(e) {
    const btn = document.getElementById('engine-switch');
    const dropdown = document.getElementById('engine-dropdown');
    if (btn && dropdown && !btn.contains(e.target) && !dropdown.contains(e.target)) {
        closeEngineDropdown();
    }
});

// ========== 主题 ==========
function toggleDarkMode() {
    document.documentElement.classList.contains('dark') ? setTheme('light') : setTheme('dark');
}

function setTheme(theme) {
    CONFIG.currentTheme = theme;
    if (typeof themeSegment !== 'undefined') {
        themeSegment.setValue(theme, true);
    }
    applyTheme();
    saveSettings();
}

function applyTheme() {
    const isDark = CONFIG.currentTheme === 'auto' ?
        window.matchMedia('(prefers-color-scheme: dark)').matches :
        CONFIG.currentTheme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);

    // 更新浮动栏主题图标
    const icon = document.getElementById('theme-icon-floating');
    if (icon) icon.className = isDark ? 'fa fa-sun-o' : 'fa fa-moon-o';

    // 向后兼容：更新旧版主题图标
    const oldIcon = document.getElementById('theme-icon');
    if (oldIcon) oldIcon.className = isDark ? 'fa fa-sun-o' : 'fa fa-moon-o';
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (CONFIG.currentTheme === 'auto') applyTheme();
});

// ========== 设置持久化 ==========
function saveSettings() {
    localStorage.setItem('kd-startpage-settings', JSON.stringify({
        currentEngine: CONFIG.currentEngine,
        currentTheme: CONFIG.currentTheme
    }));
}

function loadSettings() {
    const saved = JSON.parse(localStorage.getItem('kd-startpage-settings') || '{}');
    CONFIG.currentEngine = saved.currentEngine || 'bing';
    CONFIG.currentTheme = saved.currentTheme || 'auto';
    setSearchEngine(CONFIG.currentEngine);
}

// ========== 工具函数 ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
