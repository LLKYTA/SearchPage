// ========================================
// 全局配置对象
// ========================================
const CONFIG = {
    searchEngines: {
        baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=', icon: 'fa-search' },
        google: { name: 'Google', url: 'https://www.google.com/search?q=', icon: 'fa-google' },
        bing: { name: 'Bing', url: 'https://www.bing.com/search?q=', icon: 'fa-edge' }
    },
    currentEngine: 'bing',
    currentTheme: 'auto'
};

const DEFAULT_BOOKMARKS = [
    { name: 'B站', url: 'https://www.bilibili.com', favicon: '' },
    { name: 'V2EX', url: 'https://www.v2ex.com', favicon: '' },
    { name: '知乎', url: 'https://www.zhihu.com', favicon: '' }
];

const DEFAULT_AI_TOOLS = [
    { name: '豆包', url: 'https://www.doubao.com', favicon: '' },
    { name: '文心一言', url: 'https://yiyan.baidu.com', favicon: '' },
    { name: 'Kimi', url: 'https://kimi.moonshot.cn', favicon: '' },
    { name: '通义千问', url: 'https://tongyi.aliyun.com', favicon: '' }
];

const DEFAULT_SHORTCUTS = [
    { name: '百度', url: 'https://www.baidu.com', icon: 'fa-search', color: '#4E6EF2' },
    { name: 'GitHub', url: 'https://github.com', icon: 'fa-github', color: '#333' },
    { name: 'B站', url: 'https://www.bilibili.com', icon: 'fa-play', color: '#FB7299' },
    { name: '知乎', url: 'https://www.zhihu.com', icon: 'fa-question', color: '#0084FF' }
];

const FAVICON_FAILED_FLAG = '__FAILED__';
const MAX_RETRY = 3;

let bookmarks = [];
let aiTools = [];
let shortcuts = [];

// ========== 热榜配置 ==========
const HOTBOARD_SOURCES = {
    weibo: { name: '微博热搜', icon: 'fa-weibo' },
    zhihu: { name: '知乎热榜', icon: 'fa-question-circle' },
    bilibili: { name: 'B站热门', icon: 'fa-play-circle' },
    baidu: { name: '百度热搜', icon: 'fa-search' },
    douyin: { name: '抖音热榜', icon: 'fa-music' },
    toutiao: { name: '今日头条', icon: 'fa-newspaper-o' },
    '36kr': { name: '36氪', icon: 'fa-lightbulb-o' },
    hupu: { name: '虎扑', icon: 'fa-futbol-o' }
};
let currentHotboardSource = 'toutiao';

// ========================================
// 页面初始化
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadBookmarks();
    loadAiTools();
    loadShortcuts();
    initTime();
    initSearch();
    initTheme();
    initTodo();
    loadHotboardSource();
    loadHotboard();
    initSettingsModal();
    initManageModal();
    renderBookmarks();
    renderAiTools();
    renderShortcuts();
});

// ========================================
// 时间组件
// ========================================
function initTime() {
    updateTime();
    window.setInterval(updateTime, 1000);
}

function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const timeEl = document.getElementById('time-display');
    if (timeEl) timeEl.textContent = `${hours}:${minutes}`;
    
    const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const week = weeks[now.getDay()];
    
    const dateEl = document.getElementById('date-display');
    if (dateEl) dateEl.textContent = `${year}年${month}月${date}日 ${week}`;
}

// ========================================
// 搜索功能
// ========================================
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    if (searchBtn) searchBtn.addEventListener('click', performSearch);
}

function performSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput ? searchInput.value.trim() : '';
    if (query) {
        const engine = CONFIG.searchEngines[CONFIG.currentEngine];
        window.open(engine.url + encodeURIComponent(query), '_blank');
    }
}

function setSearchEngine(engine) {
    CONFIG.currentEngine = engine;
    document.querySelectorAll('.engine-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-engine="${engine}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    const engineName = CONFIG.searchEngines[engine].name;
    const engineHint = document.getElementById('current-engine');
    if (engineHint) engineHint.textContent = engineName;
    const defaultEngineSelect = document.getElementById('default-engine');
    if (defaultEngineSelect) defaultEngineSelect.value = engine;
    saveSettings();
}

// ========================================
// 主题切换
// ========================================
function initTheme() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (CONFIG.currentTheme === 'auto') applyTheme();
    });
}

function toggleDarkMode() {
    const html = document.documentElement;
    html.classList.contains('dark') ? setTheme('light') : setTheme('dark');
}

function setTheme(theme) {
    CONFIG.currentTheme = theme;
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-theme="${theme}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    applyTheme();
    saveSettings();
}

function applyTheme() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    let isDark = CONFIG.currentTheme === 'auto' ?
        window.matchMedia('(prefers-color-scheme: dark)').matches :
        CONFIG.currentTheme === 'dark';
    if (isDark) {
        html.classList.add('dark');
        if (themeIcon) themeIcon.className = 'fa fa-sun-o';
    } else {
        html.classList.remove('dark');
        if (themeIcon) themeIcon.className = 'fa fa-moon-o';
    }
}

// ========================================
// 待办事项（widget 显示 + 勾选交互）
// ========================================
function initTodo() {
    loadTodos();
}

function loadTodos() {
    const saved = localStorage.getItem('todos');
    const todoList = document.getElementById('todo-list');
    if (!todoList) return;
    todoList.innerHTML = '';
    if (saved) {
        try {
            const todos = JSON.parse(saved);
            todos.forEach(todo => createTodoItem(todo.text, todo.completed));
        } catch (e) { console.error('加载待办失败:', e); }
    }
}

function createTodoItem(text, completed = false) {
    const todoList = document.getElementById('todo-list');
    if (!todoList) return;
    const div = document.createElement('div');
    div.className = 'todo-item' + (completed ? ' completed' : '');
    div.innerHTML = `
        <input type="checkbox" class="todo-checkbox" ${completed ? 'checked' : ''} onchange="toggleTodo(this)">
        <span class="todo-text">${escapeHtml(text)}</span>
    `;
    todoList.appendChild(div);
}

function toggleTodo(checkbox) {
    const todoItem = checkbox.closest('.todo-item');
    checkbox.checked ? todoItem.classList.add('completed') : todoItem.classList.remove('completed');
    saveTodosFromDOM();
}

function saveTodosFromDOM() {
    const todos = [];
    document.querySelectorAll('#todo-list .todo-item').forEach(item => {
        todos.push({
            text: item.querySelector('.todo-text').textContent,
            completed: item.classList.contains('completed')
        });
    });
    localStorage.setItem('todos', JSON.stringify(todos));
}

// ========================================
// 设置弹窗
// ========================================
function initSettingsModal() {
    const overlay = document.querySelector('#settings-modal');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeSettings();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSettings();
    });
}

function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ========================================
// 本地存储设置
// ========================================
function saveDefaultEngine() {
    const select = document.getElementById('default-engine');
    if (select) setSearchEngine(select.value);
}

function saveSettings() {
    const settings = {
        currentEngine: CONFIG.currentEngine,
        currentTheme: CONFIG.currentTheme
    };
    localStorage.setItem('kd-startpage-settings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('kd-startpage-settings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            CONFIG.currentEngine = settings.currentEngine || 'bing';
            CONFIG.currentTheme = settings.currentTheme || 'auto';
            setSearchEngine(CONFIG.currentEngine);
            setTheme(CONFIG.currentTheme);
        } catch (e) { console.error('加载设置失败:', e); }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ========================================
   自定义书签 & AI 工具 & 快捷方式（数据层）
   ======================================== */
function saveBookmarks() {
    localStorage.setItem('custom-bookmarks', JSON.stringify(bookmarks));
}
function loadBookmarks() {
    const saved = localStorage.getItem('custom-bookmarks');
    bookmarks = saved ? (JSON.parse(saved) || [...DEFAULT_BOOKMARKS]) : [...DEFAULT_BOOKMARKS];
}
function saveAiTools() {
    localStorage.setItem('custom-ai-tools', JSON.stringify(aiTools));
}
function loadAiTools() {
    const saved = localStorage.getItem('custom-ai-tools');
    aiTools = saved ? (JSON.parse(saved) || [...DEFAULT_AI_TOOLS]) : [...DEFAULT_AI_TOOLS];
}
function saveShortcuts() {
    localStorage.setItem('custom-shortcuts', JSON.stringify(shortcuts));
}
function loadShortcuts() {
    const saved = localStorage.getItem('custom-shortcuts');
    shortcuts = saved ? (JSON.parse(saved) || [...DEFAULT_SHORTCUTS]) : [...DEFAULT_SHORTCUTS];
}

/* ========== 获取并缓存 Favicon ========== */
function shortRandomDelay() {
    const ms = Math.floor(Math.random() * 300);
    return new Promise(resolve => setTimeout(resolve, ms));
}
function fetchWithTimeout(url, timeout = 1500) {
    return Promise.race([
        fetch(url),
        new Promise((_, reject) => setTimeout(() => reject("timeout"), timeout))
    ]);
}
async function fetchAndCacheFavicon(item) {
    if (item.retryCount === undefined) item.retryCount = 0;
    if (item.favicon && item.favicon !== FAVICON_FAILED_FLAG) return item.favicon;
    if (item.retryCount >= MAX_RETRY) {
        item.favicon = FAVICON_FAILED_FLAG;
        return '';
    }
    try {
        const domain = new URL(item.url).hostname;
        const faviconUrl = `https://favicone.com/${domain}?s=64`;
        item.favicon = faviconUrl;
        item.retryCount = 0;
        return faviconUrl;
    } catch (err) {
        item.retryCount += 1;
        if (item.retryCount >= MAX_RETRY) item.favicon = FAVICON_FAILED_FLAG;
        return '';
    }
}

/* ========== 渲染书签 ========== */
async function renderBookmarks() {
    const grid = document.getElementById('bookmarks-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const domList = [];
    bookmarks.forEach((item, idx) => {
        const a = document.createElement('a');
        a.href = item.url;
        a.target = '_blank';
        a.className = 'bookmark-item';
        a.innerHTML = `
            <div class="bookmark-icon bookmark-icon-loading">
                <i class="fa fa-globe"></i>
            </div>
            <span class="bookmark-name">${escapeHtml(item.name)}</span>
            <button class="bookmark-delete-btn" onclick="event.preventDefault(); event.stopPropagation(); deleteBookmark(${idx})">
                <i class="fa fa-times"></i>
            </button>
        `;
        grid.appendChild(a);
        domList.push({ el: a.querySelector('.bookmark-icon'), item });
    });
    const tasks = domList.map(async ({ el, item }) => {
        const iconUrl = await fetchAndCacheFavicon(item);
        if (iconUrl) {
            el.innerHTML = `<img src="${iconUrl}" onerror="this.parentElement.innerHTML='<i class=\\'fa fa-globe\\'></i>'">`;
        }
        el.classList.remove('bookmark-icon-loading');
    });
    await Promise.race([Promise.allSettled(tasks), new Promise(resolve => setTimeout(resolve, 4000))]);
    saveBookmarks();
}

/* ========== 渲染 AI 工具 ========== */
async function renderAiTools() {
    const grid = document.getElementById('ai-tools-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const domList = [];
    aiTools.forEach((item, idx) => {
        const a = document.createElement('a');
        a.href = item.url;
        a.target = '_blank';
        a.className = 'ai-tool-item';
        a.innerHTML = `
            <div class="ai-tool-icon ai-tool-icon-loading">
                <i class="fa fa-robot"></i>
            </div>
            <span class="ai-tool-name">${escapeHtml(item.name)}</span>
            <button class="ai-tool-delete-btn" onclick="event.preventDefault(); event.stopPropagation(); deleteAiTool(${idx})">
                <i class="fa fa-times"></i>
            </button>
        `;
        grid.appendChild(a);
        domList.push({ el: a.querySelector('.ai-tool-icon'), item });
    });
    const tasks = domList.map(async ({ el, item }) => {
        const iconUrl = await fetchAndCacheFavicon(item);
        if (iconUrl) {
            el.innerHTML = `<img src="${iconUrl}" onerror="this.parentElement.innerHTML='<i class=\\'fa fa-robot\\'></i>'">`;
        }
        el.classList.remove('ai-tool-icon-loading');
    });
    await Promise.race([Promise.allSettled(tasks), new Promise(resolve => setTimeout(resolve, 4000))]);
    saveAiTools();
}

/* ========== 渲染快捷方式 ========== */
function renderShortcuts() {
    const grid = document.getElementById('shortcuts-grid');
    if (!grid) return;
    grid.innerHTML = '';
    shortcuts.forEach((item, idx) => {
        const a = document.createElement('a');
        a.href = item.url;
        a.target = '_blank';
        a.className = 'shortcut-item';
        a.style.position = 'relative';
        a.innerHTML = `
            <div class="shortcut-icon" style="background: ${item.color || '#999'};">
                <i class="fa ${item.icon || 'fa-external-link'}"></i>
            </div>
            <span class="shortcut-name">${escapeHtml(item.name)}</span>
            <button class="shortcut-delete-btn" onclick="event.preventDefault(); event.stopPropagation(); deleteShortcut(${idx})">
                <i class="fa fa-times"></i>
            </button>
        `;
        grid.appendChild(a);
    });
}

// 从 widget 直接删除（保留快速删除通道）
function deleteBookmark(index) { bookmarks.splice(index, 1); saveBookmarks(); renderBookmarks(); }
function deleteAiTool(index) { aiTools.splice(index, 1); saveAiTools(); renderAiTools(); }
function deleteShortcut(index) { shortcuts.splice(index, 1); saveShortcuts(); renderShortcuts(); }

/* ========================================
   统一管理弹窗（模态框表单管理）
   ======================================== */
let currentManageType = '';

function initManageModal() {
    const overlay = document.getElementById('manage-modal');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeManageModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeManageModal();
    });
}

function openManageModal(type) {
    currentManageType = type;
    const titleMap = {
        bookmarks: '管理常用书签',
        'ai-tools': '管理 AI 工具',
        shortcuts: '管理快捷方式',
        todos: '管理待办事项'
    };
    document.getElementById('manage-modal-title').textContent = titleMap[type] || '管理';
    document.getElementById('manage-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderManageList();
}

function closeManageModal() {
    document.getElementById('manage-modal').classList.remove('active');
    document.body.style.overflow = '';
    // 保存并刷新对应视图
    switch (currentManageType) {
        case 'bookmarks': saveBookmarks(); renderBookmarks(); break;
        case 'ai-tools': saveAiTools(); renderAiTools(); break;
        case 'shortcuts': saveShortcuts(); renderShortcuts(); break;
        case 'todos': saveTodosFromManage(); loadTodos(); break;
    }
    currentManageType = '';
}

function renderManageList() {
    const container = document.getElementById('manage-list-container');
    if (!container) return;
    container.innerHTML = '';

    let data = [];
    switch (currentManageType) {
        case 'bookmarks': data = bookmarks; break;
        case 'ai-tools': data = aiTools; break;
        case 'shortcuts': data = shortcuts; break;
        case 'todos': data = getTodosData(); break;
    }

    if (currentManageType === 'todos') {
        // 待办事项特殊布局
        data.forEach((todo, idx) => {
            const row = document.createElement('div');
            row.className = 'manage-row';
            row.innerHTML = `
                <input type="checkbox" class="manage-checkbox" ${todo.completed ? 'checked' : ''} onchange="updateTodoItem(${idx}, this.checked)">
                <input type="text" class="manage-input" value="${escapeHtml(todo.text)}" placeholder="待办内容" oninput="updateTodoItem(${idx}, null, this.value)">
                <button class="manage-delete-btn" onclick="deleteManageItem(${idx})">
                    <i class="fa fa-trash"></i>
                </button>
            `;
            container.appendChild(row);
        });
    } else {
        // 书签/AI/快捷方式
        data.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'manage-row';
            if (currentManageType === 'shortcuts') {
                // 快捷方式多一个颜色和图标字段（简化处理，仅名称和网址）
                row.innerHTML = `
                    <input type="text" class="manage-input" value="${escapeHtml(item.name)}" placeholder="名称" oninput="updateManageItem(${idx}, 'name', this.value)">
                    <input type="text" class="manage-input" value="${escapeHtml(item.url)}" placeholder="网址" oninput="updateManageItem(${idx}, 'url', this.value)">
                    <input type="text" class="manage-input" value="${escapeHtml(item.color || '#999')}" placeholder="颜色" oninput="updateManageItem(${idx}, 'color', this.value)">
                    <input type="text" class="manage-input" value="${escapeHtml(item.icon || 'fa-external-link')}" placeholder="图标类" oninput="updateManageItem(${idx}, 'icon', this.value)">
                    <button class="manage-delete-btn" onclick="deleteManageItem(${idx})">
                        <i class="fa fa-trash"></i>
                    </button>
                `;
            } else {
                row.innerHTML = `
                    <input type="text" class="manage-input" value="${escapeHtml(item.name)}" placeholder="名称" oninput="updateManageItem(${idx}, 'name', this.value)">
                    <input type="text" class="manage-input" value="${escapeHtml(item.url)}" placeholder="网址" oninput="updateManageItem(${idx}, 'url', this.value)">
                    <button class="manage-delete-btn" onclick="deleteManageItem(${idx})">
                        <i class="fa fa-trash"></i>
                    </button>
                `;
            }
            container.appendChild(row);
        });
    }
}

// 获取待办数据数组
function getTodosData() {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
}

// 更新列表中的某一项（根据输入框实时修改对应数据）
function updateManageItem(index, field, value) {
    switch (currentManageType) {
        case 'bookmarks':
            if (bookmarks[index]) bookmarks[index][field] = value;
            break;
        case 'ai-tools':
            if (aiTools[index]) aiTools[index][field] = value;
            break;
        case 'shortcuts':
            if (shortcuts[index]) shortcuts[index][field] = value;
            break;
    }
}

// 专门处理待办项的更新
function updateTodoItem(index, completed, text) {
    const todos = getTodosData();
    if (todos[index]) {
        if (completed !== null && completed !== undefined) todos[index].completed = completed;
        if (text !== null && text !== undefined) todos[index].text = text;
        localStorage.setItem('todos', JSON.stringify(todos));
    }
}

// 保存待办（从管理弹窗触发）
function saveTodosFromManage() {
    // 管理弹窗中的待办数据已实时写入 localStorage，无需额外操作
}

// 添加新项
function manageAddItem() {
    switch (currentManageType) {
        case 'bookmarks':
            bookmarks.push({ name: '新书签', url: 'https://', favicon: '' });
            saveBookmarks();
            break;
        case 'ai-tools':
            aiTools.push({ name: '新工具', url: 'https://', favicon: '' });
            saveAiTools();
            break;
        case 'shortcuts':
            shortcuts.push({ name: '新快捷', url: 'https://', icon: 'fa-external-link', color: '#999' });
            saveShortcuts();
            break;
        case 'todos':
            const todos = getTodosData();
            todos.push({ text: '新待办', completed: false });
            localStorage.setItem('todos', JSON.stringify(todos));
            break;
    }
    renderManageList();
}

// 删除某一项
function deleteManageItem(index) {
    switch (currentManageType) {
        case 'bookmarks':
            bookmarks.splice(index, 1);
            saveBookmarks();
            break;
        case 'ai-tools':
            aiTools.splice(index, 1);
            saveAiTools();
            break;
        case 'shortcuts':
            shortcuts.splice(index, 1);
            saveShortcuts();
            break;
        case 'todos':
            const todos = getTodosData();
            todos.splice(index, 1);
            localStorage.setItem('todos', JSON.stringify(todos));
            break;
    }
    renderManageList();
}

// ========================================
// 热榜功能（保持不变）
// ========================================
function loadHotboardSource() {
    const saved = localStorage.getItem('hotboard-source');
    if (saved && HOTBOARD_SOURCES[saved]) currentHotboardSource = saved;
    const select = document.getElementById('hotboard-source-select');
    if (select) select.value = currentHotboardSource;
    updateHotboardSourceName();
}
function saveHotboardSource() {
    const select = document.getElementById('hotboard-source-select');
    if (!select) return;
    const source = select.value;
    if (HOTBOARD_SOURCES[source]) {
        currentHotboardSource = source;
        localStorage.setItem('hotboard-source', source);
        updateHotboardSourceName();
        loadHotboard();
    }
}
function updateHotboardSourceName() {
    const nameEl = document.getElementById('hotboard-source-name');
    if (nameEl && HOTBOARD_SOURCES[currentHotboardSource]) {
        nameEl.textContent = HOTBOARD_SOURCES[currentHotboardSource].name;
    }
}
async function loadHotboard() {
    const listEl = document.getElementById('hotboard-list');
    const timeEl = document.getElementById('hotboard-update-time');
    const refreshBtn = document.querySelector('[data-widget-id="hotboard"] .widget-add-btn .fa-refresh');
    if (!listEl) return;
    listEl.innerHTML = `<div class="hotboard-loading"><i class="fa fa-spinner fa-spin"></i><span>加载中...</span></div>`;
    if (refreshBtn) refreshBtn.classList.add('spinning');

    if (typeof GetHotboard !== 'function') {
        await new Promise(resolve => {
            let waited = 0;
            const check = setInterval(() => {
                if (typeof GetHotboard === 'function') { clearInterval(check); resolve(); }
                else if (waited >= 3000) { clearInterval(check); resolve(); }
                waited += 100;
            }, 100);
        });
    }
    if (typeof GetHotboard !== 'function') {
        listEl.innerHTML = `<div class="hotboard-error"><i class="fa fa-exclamation-circle"></i><span>热榜模块加载失败，请刷新页面</span></div>`;
        if (refreshBtn) refreshBtn.classList.remove('spinning');
        return;
    }
    const data = await GetHotboard(currentHotboardSource);
    if (refreshBtn) refreshBtn.classList.remove('spinning');
    if (!data || !data.list || data.list.length === 0) {
        listEl.innerHTML = `<div class="hotboard-error"><i class="fa fa-exclamation-circle"></i><span>暂无热榜数据，请稍后重试</span></div>`;
        return;
    }
    if (timeEl && data.update_time) {
        const parts = data.update_time.split(' ');
        if (parts.length >= 2) timeEl.textContent = '更新于 ' + parts[1].substring(0, 5);
    }
    renderHotboardList(data.list);
}
function renderHotboardList(list) {
    const listEl = document.getElementById('hotboard-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    const displayList = list.slice(0, 15);
    displayList.forEach((item, index) => {
        const div = document.createElement('a');
        div.className = 'hotboard-item';
        div.href = item.url || '#';
        div.target = '_blank';
        let hotValue = '';
        if (item.hot_value) {
            const hot = parseInt(item.hot_value);
            hotValue = hot >= 10000 ? (hot / 10000).toFixed(1) + '万' : hot.toString();
        }
        let tagHtml = '';
        if (item.extra && item.extra.tag) {
            const tag = item.extra.tag;
            let tagClass = 'hotboard-tag';
            if (tag === '爆' || tag === '爆点') tagClass += ' boom';
            else if (tag === '新' || tag === 'NEW') tagClass += ' new';
            else if (tag === '热' || tag === 'HOT') tagClass += ' hot';
            tagHtml = `<span class="${tagClass}">${tag}</span>`;
        }
        div.innerHTML = `
            <div class="hotboard-rank">${index + 1}</div>
            <span class="hotboard-title">${escapeHtml(item.title || '')}</span>
            ${tagHtml}
            ${hotValue ? `<span class="hotboard-hot"><i class="fa fa-fire"></i>${hotValue}</span>` : ''}
        `;
        listEl.appendChild(div);
    });
}
function refreshHotboard() { loadHotboard(); }
function onUapiReady() {
    const listEl = document.getElementById('hotboard-list');
    if (listEl && listEl.querySelector('.hotboard-error')) loadHotboard();
}

// ========================================
// 背景设置（修复 event 未传参问题）
// ========================================
function setBackground(type, el) {
    document.querySelectorAll('.bg-option').forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');
    else if (event && event.currentTarget) event.currentTarget.classList.add('active');
    localStorage.setItem('background', type);
}