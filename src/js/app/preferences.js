/* ==========================================
   settings.js - 设置弹窗、搜索设置、热榜、词库
   ========================================== */

// ========== 设置弹窗 ==========
function openSettings() {
    window.settingsModal?.open();
}

function closeSettings() {
    window.settingsModal?.close();
}

// ========== 背景 ==========
function setBackground(type) {
    localStorage.setItem('background', type);
}

// ========== 统一初始化设置中的下拉菜单和导航 ==========
let engineDropdown, hotboardDropdown, wordDropdown;
let navPage = null;
let toggleSuggestions, toggleRecents;

function initSettingsDropdowns() {
    // 引擎选择（只显示已启用的引擎）
    const enabled = getEnabledEngines();
    engineDropdown = new UIDropdown({
        el: document.getElementById('settings-engine-dd'),
        items: enabled.map(id => {
            const cfg = getEngineConfig(id);
            return { value: id, label: cfg.name, icon: cfg.icon || 'fa-search' };
        }),
        initialValue: CONFIG.currentEngine,
        onChange: (value) => setSearchEngine(value)
    });

    // 热榜来源
    hotboardDropdown = new UIDropdown({
        el: document.getElementById('settings-hotboard-dd'),
        items: [
            { value: 'weibo',    label: '微博热搜',  icon: 'fa-weibo' },
            { value: 'zhihu',    label: '知乎热榜',  icon: 'fa-question-circle' },
            { value: 'bilibili', label: 'B站热门',   icon: 'fa-play-circle' },
            { value: 'baidu',    label: '百度热搜',  icon: 'fa-paw' },
            { value: 'douyin',   label: '抖音热榜',  icon: 'fa-music' },
            { value: 'toutiao',  label: '今日头条',  icon: 'fa-newspaper-o' },
            { value: '36kr',     label: '36氪',     icon: 'fa-line-chart' },
            { value: 'hupu',     label: '虎扑',     icon: 'fa-trophy' }
        ],
        initialValue: localStorage.getItem('hotboard-source') || 'weibo',
        onChange: (value) => {
            localStorage.setItem('hotboard-source', value);
            const area = WidgetFramework.areas.get('main-area');
            if (area) {
                area.widgets.forEach(w => {
                    if (w instanceof HotboardWidget) w.onUpdate();
                });
            }
        }
    });

    // 单词词库
    wordDropdown = new UIDropdown({
        el: document.getElementById('settings-word-dd'),
        items: [
            { value: 'all',   label: '全部词汇',            icon: 'fa-book' },
            { value: 'cet4',  label: '四级词汇 (CET-4)',    icon: 'fa-graduation-cap' },
            { value: 'cet6',  label: '六级词汇 (CET-6)',    icon: 'fa-graduation-cap' },
            { value: 'ielts', label: '雅思词汇 (IELTS)',     icon: 'fa-language' },
            { value: 'toefl', label: '托福词汇 (TOEFL)',     icon: 'fa-language' },
            { value: 'gre',   label: 'GRE 词汇',            icon: 'fa-flask' }
        ],
        initialValue: localStorage.getItem('dailyword-category') || 'all',
        onChange: (value) => {
            localStorage.setItem('dailyword-category', value);
            const area = WidgetFramework.areas.get('main-area');
            if (area) {
                area.widgets.forEach(w => {
                    if (w instanceof DailyWordWidget) w.onUpdate();
                });
            }
        }
    });
}

/** 当启用的引擎列表变化时，更新设置中的引擎下拉菜单 */
function refreshEngineDropdown() {
    if (!engineDropdown) return;
    const enabled = getEnabledEngines();
    const items = enabled.map(id => {
        const cfg = getEngineConfig(id);
        return { value: id, label: cfg.name, icon: cfg.icon || 'fa-search' };
    });
    engineDropdown.updateItems(items);
    // 如果当前引擎不在列表中，切换到第一个
    if (!enabled.includes(CONFIG.currentEngine) && enabled.length > 0) {
        engineDropdown.setValue(enabled[0], true);
    } else {
        engineDropdown.setValue(CONFIG.currentEngine, true);
    }
}

// ========== 设置导航页面 ==========

function initSettingsNavigation() {
    const body = document.querySelector('#settings-modal .settings-body');
    if (!body) return;
    navPage = new UINavigationPage(body, {
        onPush: (pageId) => {
            if (pageId === 'search') {
                // 初始化搜索设置页面
                initSearchSettingsPage();
            }
        },
        onPop: () => {
            // 返回到根页面时刷新引擎下拉（启停可能已变更）
            refreshEngineDropdown();
        }
    });
    window.navPage = navPage;
}

// ========== 搜索设置 ==========

function openSearchSettings() {
    if (!navPage) initSettingsNavigation();
    if (navPage) navPage.push('search');
}

function initSearchSettingsPage() {
    // 只初始化一次
    if (toggleSuggestions) return;

    // 搜索建议开关
    const suggestEl = document.getElementById('toggle-suggestions');
    if (suggestEl) {
        toggleSuggestions = new UIToggle({
            el: suggestEl,
            initialValue: localStorage.getItem('search-suggestions-enabled') !== 'false',
            onChange: (val) => {
                localStorage.setItem('search-suggestions-enabled', val);
            }
        });
        window.__toggleSuggestions = toggleSuggestions;
    }

    // 最近搜索开关
    const recentsEl = document.getElementById('toggle-recents');
    if (recentsEl) {
        toggleRecents = new UIToggle({
            el: recentsEl,
            initialValue: localStorage.getItem('recent-searches-enabled') !== 'false',
            onChange: (val) => {
                localStorage.setItem('recent-searches-enabled', val);
            }
        });
        window.__toggleRecents = toggleRecents;
    }
}

function closeWidgetGallery() {
    window.galleryModal?.close();
}
