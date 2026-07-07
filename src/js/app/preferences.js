/* ==========================================
   settings.js - 设置弹窗、热榜来源、背景、词库
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

// ========== 统一初始化设置中的下拉菜单 ==========
let engineDropdown, hotboardDropdown, wordDropdown;

function initSettingsDropdowns() {
    // 引擎选择
    engineDropdown = new UIDropdown({
        el: document.getElementById('settings-engine-dd'),
        items: [
            { value: 'bing',   label: 'Bing',   icon: 'fa-edge' },
            { value: 'baidu',  label: '百度',    icon: 'fa-search' },
            { value: 'google', label: 'Google',  icon: 'fa-google' }
        ],
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

function closeWidgetGallery() {
    window.galleryModal?.close();
}
