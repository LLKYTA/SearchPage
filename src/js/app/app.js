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

// ========== 可扩展搜索引擎池 ==========
const SEARCH_ENGINE_POOL = [
    { id: 'google',     name: 'Google',     url: 'https://www.google.com/search?q=',     icon: 'fa-google' },
    { id: 'bing',       name: 'Bing',       url: 'https://www.bing.com/search?q=',       icon: 'fa-edge' },
    { id: 'baidu',      name: '百度',       url: 'https://www.baidu.com/s?wd=',          icon: 'fa-search' },
    { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=',           icon: 'fa-search' },
    { id: 'sogou',      name: '搜狗',       url: 'https://www.sogou.com/web?query=',    icon: 'fa-search' },
    { id: '360',        name: '360搜索',    url: 'https://www.so.com/s?q=',             icon: 'fa-search' },
    { id: 'yahoo',      name: 'Yahoo',      url: 'https://search.yahoo.com/search?p=',   icon: 'fa-yahoo' },
];

// ========== 搜索引擎辅助函数 ==========

/** 获取已启用的引擎 ID 列表 */
function getEnabledEngines() {
    const saved = localStorage.getItem('search-enabled-engines');
    if (saved) {
        try { return JSON.parse(saved); }
        catch { /* fall through */ }
    }
    // 首次加载：从旧 CONFIG 同步
    return ['bing', 'google', 'baidu'];
}

/** 保存已启用的引擎 ID 列表 */
function saveEnabledEngines(engines) {
    localStorage.setItem('search-enabled-engines', JSON.stringify(engines));
}

/** 从引擎池中查找引擎配置 */
function getEngineConfig(id) {
    return SEARCH_ENGINE_POOL.find(e => e.id === id) ||
           CONFIG.searchEngines[id] ||
           { id, name: id, url: '', icon: 'fa-search' };
}

/** 获取引擎图标 */
function getEngineIcon(id) {
    const pool = SEARCH_ENGINE_POOL.find(e => e.id === id);
    if (pool) return pool.icon;
    const icons = { baidu: 'fa-search', google: 'fa-google', bing: 'fa-edge' };
    return icons[id] || 'fa-search';
}

/** 动态渲染引擎下拉菜单 */
function renderEngineDropdown() {
    const dropdown = document.getElementById('engine-dropdown');
    if (!dropdown) return;
    const engines = getEnabledEngines();
    dropdown.innerHTML = engines.map(id => {
        const cfg = getEngineConfig(id);
        const isActive = id === CONFIG.currentEngine;
        return `<button class="engine-dropdown-item ${isActive ? 'active' : ''}"
                        data-engine="${id}"
                        onclick="selectEngineFromDropdown('${id}')">
            <i class="fa ${cfg.icon || 'fa-search'}"></i> ${cfg.name}
        </button>`;
    }).join('') +
    '<div class="engine-dropdown-divider"></div>' +
    `<button class="engine-dropdown-item edit-btn" data-engine="__edit__" onclick="openEngineManager();closeEngineDropdown()">
        <i class="fa fa-pencil"></i> 编辑
    </button>` +
    '<div class="engine-dropdown-divider"></div>' +
    `<button class="engine-dropdown-item reset-btn" onclick="resetSearchSystem();closeEngineDropdown()">
        <i class="fa fa-refresh"></i> 搜索系统重置
    </button>`;
}

/** 从下拉菜单选择引擎 */
window.selectEngineFromDropdown = function(engine) {
    setSearchEngine(engine);
    closeEngineDropdown();
};

/** 搜索系统重置 — 恢复所有搜索相关设置至出厂默认值 */
window.resetSearchSystem = function() {
    if (!confirm('确认重置搜索引擎设置？\n\n此操作将：\n• 恢复默认搜索引擎（百度、Google、Bing）\n• 清除最近搜索记录\n• 恢复搜索建议和最近搜索开关至开启状态')) return;

    // 1. 恢复默认启用的搜索引擎
    saveEnabledEngines(['bing', 'google', 'baidu']);

    // 2. 恢复默认当前引擎（Bing）
    CONFIG.currentEngine = 'bing';

    // 3. 清除最近搜索
    localStorage.removeItem('recent-searches');

    // 4. 恢复搜索建议和最近搜索开关
    localStorage.setItem('search-suggestions-enabled', 'true');
    localStorage.setItem('recent-searches-enabled', 'true');

    // 5. 持久化设置
    saveSettings();

    // 6. 更新界面 — 引擎显示
    setSearchEngine('bing');
    renderEngineDropdown();

    // 7. 刷新设置页面的引擎下拉菜单
    if (typeof refreshEngineDropdown === 'function') refreshEngineDropdown();

    // 8. 关闭搜索卡片扩展区
    closeSearchOverlay();

    // 9. 同步 UI 开关组件（如果设置页面已初始化）
    try {
        if (window.__toggleSuggestions) window.__toggleSuggestions.setValue(true, true);
        if (window.__toggleRecents) window.__toggleRecents.setValue(true, true);
    } catch (e) { /* 静默 — 开关可能未初始化 */ }

    // 10. 关闭设置弹窗（如果开着）
    if (window.settingsModal) window.settingsModal.close();
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
let themeSegment;

document.addEventListener('DOMContentLoaded', () => {
    WidgetFramework.init();
    // 壁纸系统初始化（wallpaper.js 需在 app.js 之前加载）
    if (typeof WallpaperSystem !== 'undefined') {
        WallpaperSystem.init();
        document.body.classList.add('wallpaper-ready');
    }
    renderEngineDropdown();
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

    // 初始化搜索建议和最近搜索
    initSearchSuggestions();
    initRecentSearches();

    // 搜索框自动获得焦点（桌面端），类似 iOS 18 的快速搜索
    if (window.innerWidth > 768 && !/Mobi|Android/i.test(navigator.userAgent)) {
        setTimeout(() => input.focus(), 1500);
    }
}

function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (query) {
        // 记录最近搜索
        saveRecentSearch(query, CONFIG.currentEngine);
        // 关闭覆盖层
        closeSearchOverlay();
        window.open(getEngineConfig(CONFIG.currentEngine).url + encodeURIComponent(query), '_blank');
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
    const cfg = getEngineConfig(engine);

    // 更新内联引擎切换钮
    const nameEl = document.getElementById('engine-inline-name');
    const iconEl = document.getElementById('engine-inline-icon');
    if (nameEl) nameEl.textContent = cfg.name;
    if (iconEl) iconEl.className = 'fa ' + (cfg.icon || 'fa-search');

    // 更新下拉菜单
    document.querySelectorAll('.engine-dropdown-item').forEach(b => b.classList.remove('active'));
    const activeItem = document.querySelector(`.engine-dropdown-item[data-engine="${engine}"]`);
    if (activeItem) activeItem.classList.add('active');

    // 向后兼容：旧的 engine-btn / engine-pill
    document.querySelectorAll('.engine-btn, .engine-pill').forEach(b => b.classList.remove('active'));
    const oldByEngine = document.querySelector(`[data-engine="${engine}"]`);
    if (oldByEngine) oldByEngine.classList.add('active');

    const hint = document.getElementById('current-engine');
    if (hint) hint.textContent = cfg.name;
    if (typeof engineDropdown !== 'undefined') {
        engineDropdown.setValue(engine, true);
    }
    saveSettings();
}

// ========== 搜索卡片扩展区管理 ==========
function openSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) {
        overlay.classList.add('open');
    }
}

function closeSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) {
        overlay.classList.remove('open');
        document.getElementById('searchSuggestions').style.display = 'none';
        document.getElementById('searchRecents').style.display = 'none';
    }
    // 关闭引擎下拉（避免两个覆盖层同时显示）
    closeEngineDropdown();
}

// 点击外部关闭搜索卡片扩展区
document.addEventListener('click', function(e) {
    const searchCard = document.getElementById('searchCard');
    if (searchCard && !searchCard.contains(e.target)) {
        closeSearchOverlay();
    }
});

// ========== 搜索建议 ==========
const SUGGESTION_CACHE = {};
let suggestTimer = null;

/**
 * 获取搜索建议
 * @param {string} engineId - 搜索引擎 ID
 * @param {string} query - 搜索词
 * @returns {Promise<string[]>} 建议列表
 */
async function getSuggestions(engineId, query) {
    if (!query || query.length < 2) return [];
    const cacheKey = engineId + ':' + query;
    if (SUGGESTION_CACHE[cacheKey]) return SUGGESTION_CACHE[cacheKey];

    try {
        let url;
        if (engineId === 'baidu') {
            // Baidu 建议 API（需要 script tag JSONP 方式）
            url = `https://suggestion.baidu.com/s?wd=${encodeURIComponent(query)}&cb=`;
            const resp = await fetch(url);
            if (!resp.ok) return [];
            const text = await resp.text();
            // Baidu 返回格式: window.baidu.sug({q:'...',p:false,s:['a','b',...]})
            const match = text.match(/s:\s*(\[[^\]]+\])/);
            if (match) {
                const items = JSON.parse(match[1]);
                SUGGESTION_CACHE[cacheKey] = items;
                return items;
            }
            return [];
        } else if (engineId === 'google') {
            url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
            const resp = await fetch(url);
            if (!resp.ok) return [];
            const data = await resp.json();
            const items = data[1] || [];
            SUGGESTION_CACHE[cacheKey] = items;
            return items;
        }
        // 其他引擎暂不支持建议
        return [];
    } catch (e) {
        console.warn('获取搜索建议失败:', e);
        return [];
    }
}

function showSuggestions(items, query) {
    const container = document.getElementById('searchSuggestions');
    const recents = document.getElementById('searchRecents');
    if (!items || !items.length) {
        container.style.display = 'none';
        return;
    }
    recents.style.display = 'none';
    container.style.display = 'block';
    openSearchOverlay();

    container.innerHTML = items.map(item => {
        const hl = item.replace(new RegExp(escapeRegExp(query), 'gi'),
            m => `<span class="suggestion-hl">${escapeHtml(m)}</span>`);
        return `<button class="suggestion-item" onclick="fillSuggestion('${escapeHtml(item)}')">
            <i class="fa fa-search"></i>
            <span class="suggestion-query">${hl}</span>
        </button>`;
    }).join('');
}

/** 点击建议项 */
window.fillSuggestion = function(query) {
    const input = document.getElementById('search-input');
    input.value = query;
    closeSearchOverlay();
    performSearch();
};

function initSearchSuggestions() {
    const input = document.getElementById('search-input');
    input.addEventListener('input', function() {
        const query = this.value.trim();
        clearTimeout(suggestTimer);
        // 自动填充或引擎切换时不要触发
        if (this._filling) {
            this._filling = false;
            return;
        }
        if (query.length < 2) {
            closeSearchOverlay();
            document.getElementById('searchSuggestions').style.display = 'none';
            return;
        }
        suggestTimer = setTimeout(async () => {
            const suggestionsEnabled = localStorage.getItem('search-suggestions-enabled') !== 'false';
            if (!suggestionsEnabled) return;
            const items = await getSuggestions(CONFIG.currentEngine, query);
            showSuggestions(items, query);
        }, 200);
    });
}

// ========== 最近搜索 ==========

function getRecentSearches() {
    try {
        return JSON.parse(localStorage.getItem('recent-searches') || '[]');
    } catch { return []; }
}

function saveRecentSearch(query, engine) {
    const recents = getRecentSearches();
    // 去重：有相同 query+engine 的移到最前
    const idx = recents.findIndex(r => r.query === query && r.engine === engine);
    if (idx >= 0) recents.splice(idx, 1);
    const cfg = getEngineConfig(engine);
    recents.unshift({
        query,
        engine,
        engineName: cfg.name,
        timestamp: Date.now()
    });
    // 限制最多 10 条
    if (recents.length > 10) recents.length = 10;
    localStorage.setItem('recent-searches', JSON.stringify(recents));
}

function showRecentSearches() {
    const recentEnabled = localStorage.getItem('recent-searches-enabled') !== 'false';
    if (!recentEnabled) return;
    const recents = getRecentSearches();
    const container = document.getElementById('searchRecents');
    const suggestions = document.getElementById('searchSuggestions');
    if (!recents.length) {
        container.style.display = 'none';
        return;
    }

    suggestions.style.display = 'none';
    container.style.display = 'block';
    openSearchOverlay();

    container.innerHTML = `
        <div class="recent-header">
            <span>最近搜索</span>
            <button class="recent-clear-btn" onclick="clearRecentSearches()">清除</button>
        </div>
        ${recents.map(r => {
            const cfg = getEngineConfig(r.engine);
            const timeStr = formatRecentTime(r.timestamp);
            return `<button class="recent-item" onclick="fillRecentSearch('${r.engine}', '${escapeHtml(r.query)}')">
                <i class="fa ${cfg.icon || 'fa-search'}"></i>
                <span class="recent-item-query">${escapeHtml(r.query)}</span>
                <span class="recent-item-engine">${escapeHtml(r.engineName)}</span>
                <span class="recent-item-time">${timeStr}</span>
            </button>`;
        }).join('')}
    `;
}

/** 点击最近搜索项 */
window.fillRecentSearch = function(engine, query) {
    if (engine !== CONFIG.currentEngine) {
        setSearchEngine(engine);
    }
    const input = document.getElementById('search-input');
    input._filling = true;
    input.value = query;
    closeSearchOverlay();
    performSearch();
};

window.clearRecentSearches = function() {
    localStorage.removeItem('recent-searches');
    closeSearchOverlay();
    document.getElementById('searchRecents').style.display = 'none';
};

function formatRecentTime(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    const d = new Date(timestamp);
    return (d.getMonth() + 1) + '/' + d.getDate();
}

function initRecentSearches() {
    const input = document.getElementById('search-input');
    input.addEventListener('focus', function() {
        if (!this.value.trim()) {
            showRecentSearches();
        }
    });
    input.addEventListener('input', function() {
        if (this.value.trim()) {
            document.getElementById('searchRecents').style.display = 'none';
        }
    });
    // 点击输入框关闭引擎下拉
    input.addEventListener('click', function(e) {
        e.stopPropagation();
        closeEngineDropdown();
        if (!this.value.trim()) {
            showRecentSearches();
        }
    });
}

// ========== 工具函数 ==========
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

}

function initUIModals() {
    // 设置弹窗
    window.settingsModal = new UIModal(document.getElementById('settings-modal'), {
        closeOnOverlay: false,
        onOpen: () => {
            // 打开设置时刷新引擎下拉（可能已被管理弹窗变更）
            if (typeof refreshEngineDropdown === 'function') refreshEngineDropdown();
        }
    });
    // 设置导航页面（放在 settings-body 内，需等 settingsModal 初始化）
    initSettingsNavigation();
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
                window.galleryModal.close(false); // swipe 已处理动画
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
function toggleEngineDropdown(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const dropdown = document.getElementById('engine-dropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('open');
    // 引擎下拉打开时关闭搜索覆盖层
    if (dropdown.classList.contains('open')) {
        closeSearchOverlay();
    }
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
