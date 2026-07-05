/* ==========================================
   core.js - 核心逻辑、初始化、搜索、主题
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

document.addEventListener('DOMContentLoaded', () => {
    WidgetFramework.init();
    initSearch();
    loadSettings();
    applyTheme();
    loadDailyWordCategory();

    const hotboardSelect = document.getElementById('hotboard-source-select');
    if (hotboardSelect) {
        const savedSource = localStorage.getItem('hotboard-source') || 'weibo';
        hotboardSelect.value = savedSource;
    }

    // iOS 风格启动动画
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('hide');
            splash.addEventListener('transitionend', () => {
                splash.remove();
            }, { once: true });
        }, 1900);
    }
});

// ========== 搜索 ==========
function initSearch() {
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    document.getElementById('search-btn').addEventListener('click', performSearch);
}

function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (query) {
        window.open(CONFIG.searchEngines[CONFIG.currentEngine].url + encodeURIComponent(query), '_blank');
    }
}

function setSearchEngine(engine) {
    CONFIG.currentEngine = engine;
    document.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-engine="${engine}"]`).classList.add('active');
    document.getElementById('current-engine').textContent = CONFIG.searchEngines[engine].name;
    document.getElementById('default-engine').value = engine;
    saveSettings();
}

function saveDefaultEngine() {
    const select = document.getElementById('default-engine');
    if (select) setSearchEngine(select.value);
}

// ========== 主题 ==========
function toggleDarkMode() {
    document.documentElement.classList.contains('dark') ? setTheme('light') : setTheme('dark');
}

function setTheme(theme) {
    CONFIG.currentTheme = theme;
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
    applyTheme();
    saveSettings();
}

function applyTheme() {
    const isDark = CONFIG.currentTheme === 'auto' ?
        window.matchMedia('(prefers-color-scheme: dark)').matches :
        CONFIG.currentTheme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = isDark ? 'fa fa-sun-o' : 'fa fa-moon-o';
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
    document.getElementById('default-engine').value = CONFIG.currentEngine;
    setSearchEngine(CONFIG.currentEngine);
}

// ========== 工具函数 ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
