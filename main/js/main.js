// ========================================
// 全局配置对象 - 存储所有全局配置
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
    { name: '思否', url: 'https://segmentfault.com', favicon: '' },
    { name: 'CSDN', url: 'https://www.csdn.net', favicon: '' },
    { name: '菜鸟教程', url: 'https://www.runoob.com', favicon: '' },
    { name: 'V2EX', url: 'https://www.v2ex.com', favicon: '' },
    { name: '知乎', url: 'https://www.zhihu.com', favicon: '' }
];

const DEFAULT_AI_TOOLS = [
    { name: '豆包', url: 'https://www.doubao.com', favicon: '' },
    { name: '文心一言', url: 'https://yiyan.baidu.com', favicon: '' },
    { name: 'Kimi', url: 'https://kimi.moonshot.cn', favicon: '' },
    { name: '通义千问', url: 'https://tongyi.aliyun.com', favicon: '' }
];

const FAVICON_FAILED_FLAG = '__FAILED__';
const MAX_RETRY = 3;

let bookmarks = [];
let aiTools = [];


// ========================================
// 页面初始化入口
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadBookmarks();
    loadAiTools();
    initTime();
    initSearch();
    initTheme();
    initTodo();
    initSettingsModal();
    renderBookmarks();
    renderAiTools();
});


// ========================================
// 时间更新模块
// ========================================
function initTime() {
    updateTime();
    window.setInterval(function () {
        updateTime();
    }, 1000);
}

function updateTime() {
    const now = new Date();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const timeEl = document.getElementById('time-display');
    if (timeEl) {
        timeEl.textContent = `${hours}:${minutes}`;
    }

    const weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const week = weeks[now.getDay()];

    const dateEl = document.getElementById('date-display');
    if (dateEl) {
        dateEl.textContent = `${year}年${month}月${date}日 ${week}`;
    }
}


// ========================================
// 搜索引擎模块
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
// 主题切换模块
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

    let isDark = CONFIG.currentTheme === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : CONFIG.currentTheme === 'dark';

    if (isDark) {
        html.classList.add('dark');
        if (themeIcon) themeIcon.className = 'fa fa-sun-o';
    } else {
        html.classList.remove('dark');
        if (themeIcon) themeIcon.className = 'fa fa-moon-o';
    }
}


// ========================================
// 待办事项模块
// ========================================
function initTodo() {
    loadTodos();
}

function addTodo() {
    const text = prompt('请输入待办事项:');
    if (text && text.trim()) {
        createTodoItem(text.trim(), false);
        saveTodos();
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
    saveTodos();
}

function saveTodos() {
    const todos = [];
    document.querySelectorAll('#todo-list .todo-item').forEach(item => {
        todos.push({
            text: item.querySelector('.todo-text').textContent,
            completed: item.classList.contains('completed')
        });
    });
    localStorage.setItem('todos', JSON.stringify(todos));
}

function loadTodos() {
    const saved = localStorage.getItem('todos');
    if (saved) {
        try {
            const todos = JSON.parse(saved);
            todos.forEach(todo => createTodoItem(todo.text, todo.completed));
        } catch (e) {
            console.error('加载待办事项失败:', e);
        }
    }
}


// ========================================
// 设置弹窗模块
// ========================================
function initSettingsModal() {
    const overlay = document.querySelector('.modal-overlay');
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
// 本地存储公共方法
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
        } catch (e) {
            console.error('加载设置失败:', e);
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// ========================================
// 自定义书签 & AI工具 数据持久化
// ========================================
function saveBookmarks() {
    localStorage.setItem('custom-bookmarks', JSON.stringify(bookmarks));
}

function loadBookmarks() {
    const saved = localStorage.getItem('custom-bookmarks');
    if (saved) {
        try {
            bookmarks = JSON.parse(saved);
        } catch (e) {
            console.error('加载书签失败:', e);
            bookmarks = [...DEFAULT_BOOKMARKS];
        }
    } else {
        bookmarks = [...DEFAULT_BOOKMARKS];
    }
}

function saveAiTools() {
    localStorage.setItem('custom-ai-tools', JSON.stringify(aiTools));
}

function loadAiTools() {
    const saved = localStorage.getItem('custom-ai-tools');
    if (saved) {
        try {
            aiTools = JSON.parse(saved);
        } catch (e) {
            console.error('加载AI工具失败:', e);
            aiTools = [...DEFAULT_AI_TOOLS];
        }
    } else {
        aiTools = [...DEFAULT_AI_TOOLS];
    }
}


// ========================================
// 网站图标Favicon加载逻辑
// ========================================
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

    if (item.favicon && item.favicon !== FAVICON_FAILED_FLAG) {
        return item.favicon;
    }

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
        if (item.retryCount >= MAX_RETRY) {
            item.favicon = FAVICON_FAILED_FLAG;
        }
        return '';
    }
}


// ========================================
// 书签与AI工具渲染
// ========================================
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

    await Promise.race([
        Promise.allSettled(tasks),
        new Promise(resolve => setTimeout(resolve, 4000))
    ]);
    saveBookmarks();
}

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

    await Promise.race([
        Promise.allSettled(tasks),
        new Promise(resolve => setTimeout(resolve, 4000))
    ]);
    saveAiTools();
}


// ========================================
// 书签与AI工具 增删管理
// ========================================
function addBookmark() {
    const url = prompt('请输入网站地址（例如 https://example.com）:');
    if (!url || !url.trim()) return;

    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
    }

    const name = prompt('请输入网站名称:', '') || cleanUrl;

    bookmarks.push({
        name: name.trim(),
        url: cleanUrl,
        favicon: ''
    });

    saveBookmarks();
    renderBookmarks();
}

function deleteBookmark(index) {
    if (!confirm(`确定要删除「${bookmarks[index].name}」吗？`)) return;
    bookmarks.splice(index, 1);
    saveBookmarks();
    renderBookmarks();
}

function addAiTool() {
    const url = prompt('请输入 AI 工具地址（例如 https://chat.example.com）:');
    if (!url || !url.trim()) return;

    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
    }

    const name = prompt('请输入工具名称:', '') || cleanUrl;

    aiTools.push({
        name: name.trim(),
        url: cleanUrl,
        favicon: ''
    });

    saveAiTools();
    renderAiTools();
}

function deleteAiTool(index) {
    if (!confirm(`确定要删除「${aiTools[index].name}」吗？`)) return;
    aiTools.splice(index, 1);
    saveAiTools();
    renderAiTools();
}


// ========================================
// 书签弹窗管理器
// ========================================
function openBookmarkManager() {
    const list = bookmarks.map((b, i) => `${i + 1}. ${b.name} — ${b.url}`).join('\n');
    const action = prompt(
        `【常用书签管理】\n\n当前书签列表：\n${list}\n\n` +
        `操作说明：\n` +
        `• 输入 "add" — 添加新书签\n` +
        `• 输入编号（如 "1"）— 删除对应书签\n` +
        `• 直接取消 — 关闭管理`,
        ''
    );

    if (action === null) return;

    if (action.toLowerCase() === 'add') {
        addBookmark();
    } else if (/^\d+$/.test(action.trim())) {
        const idx = parseInt(action.trim()) - 1;
        if (idx >= 0 && idx < bookmarks.length) {
            deleteBookmark(idx);
        } else {
            alert('编号无效');
        }
    }
}

function openAiToolManager() {
    const list = aiTools.map((t, i) => `${i + 1}. ${t.name} — ${t.url}`).join('\n');
    const action = prompt(
        `【AI 工具管理】\n\n当前工具列表：\n${list}\n\n` +
        `操作说明：\n` +
        `• 输入 "add" — 添加新工具\n` +
        `• 输入编号（如 "1"）— 删除对应工具\n` +
        `• 直接取消 — 关闭管理`,
        ''
    );

    if (action === null) return;

    if (action.toLowerCase() === 'add') {
        addAiTool();
    } else if (/^\d+$/.test(action.trim())) {
        const idx = parseInt(action.trim()) - 1;
        if (idx >= 0 && idx < aiTools.length) {
            deleteAiTool(idx);
        } else {
            alert('编号无效');
        }
    }
}


// ========================================
// 背景设置
// ========================================
function setBackground(type) {
    document.querySelectorAll('.bg-option').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    localStorage.setItem('background', type);
}


// ========================================
// 小组件拖拽排序系统
// ========================================
function initDragSystem() {
    ['widgets-grid', 'large-widgets'].forEach(containerId => {
        const container = document.querySelector('.' + containerId);
        if (!container) return;

        let draggedWidget = null;
        let draggedIndex = null;

        const widgets = container.querySelectorAll('.widget');
        widgets.forEach((widget, index) => {
            widget.setAttribute('draggable', 'true');
            widget.dataset.index = index;
        });

        container.addEventListener('dragstart', (e) => {
            if (!e.target.classList.contains('widget')) return;
            draggedWidget = e.target;
            draggedIndex = parseInt(e.target.dataset.index);
            e.target.classList.add('widget-dragging');
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => e.target.style.opacity = '0.4', 0);
        });

        container.addEventListener('dragend', (e) => {
            if (!e.target.classList.contains('widget')) return;
            e.target.classList.remove('widget-dragging');
            e.target.style.opacity = '1';
            container.querySelectorAll('.widget-drag-over').forEach(el => el.classList.remove('widget-drag-over'));
            draggedWidget = null;
            draggedIndex = null;
            saveWidgetOrder(container);
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        container.addEventListener('dragenter', (e) => {
            e.preventDefault();
            const target = e.target.closest('.widget');
            if (target && target !== draggedWidget) target.classList.add('widget-drag-over');
        });

        container.addEventListener('dragleave', (e) => {
            const target = e.target.closest('.widget');
            if (target) target.classList.remove('widget-drag-over');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const target = e.target.closest('.widget');
            if (!target || target === draggedWidget) return;
            target.classList.remove('widget-drag-over');

            const targetIndex = parseInt(target.dataset.index);
            const allWidgets = Array.from(container.querySelectorAll('.widget'));

            if (draggedIndex < targetIndex) {
                container.insertBefore(allWidgets[draggedIndex], allWidgets[targetIndex].nextSibling);
            } else {
                container.insertBefore(allWidgets[draggedIndex], allWidgets[targetIndex]);
            }

            container.querySelectorAll('.widget').forEach((widget, index) => {
                widget.dataset.index = index;
            });
        });
    });
}

function saveWidgetOrder(container) {
    const order = [];
    container.querySelectorAll('.widget').forEach(widget => {
        order.push(widget.dataset.widgetId || widget.id);
    });
    localStorage.setItem('widgetOrder_' + container.className, JSON.stringify(order));
}
//6.18   KD
