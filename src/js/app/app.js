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
WidgetFramework.register('ai-tools', AiToolsWidget);
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
    bing: 'fa-windows'
};

function setSearchEngine(engine) {
    CONFIG.currentEngine = engine;

    // 更新内联引擎切换钮
    const nameEl = document.getElementById('engine-inline-name');
    const iconEl = document.getElementById('engine-inline-icon');
    if (nameEl) nameEl.textContent = CONFIG.searchEngines[engine].name;
    if (iconEl) iconEl.className = ENGINE_ICONS[engine] || 'fa-search';

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
        closeOnOverlay: false
    });
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
    if (btn && !btn.contains(e.target)) {
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
