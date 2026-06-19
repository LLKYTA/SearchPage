// ========================================
// 全局配置对象 - 存储所有全局配置
// ========================================
const CONFIG = {
    // 搜索引擎配置：存储三个搜索引擎的信息
    searchEngines: {
        baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=', icon: 'fa-search' },
        google: { name: 'Google', url: 'https://www.google.com/search?q=', icon: 'fa-google' },
        bing: { name: 'Bing', url: 'https://www.bing.com/search?q=', icon: 'fa-edge' }
    },
    currentEngine: 'bing', // 当前选中的搜索引擎，默认是必应
    currentTheme: 'auto' // 当前主题模式，默认是自动跟随系统
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
const FAVICON_FAILED_FLAG = '__FAILED__';
const MAX_RETRY = 3; // 最多重新获取2次
// 运行时数据
let bookmarks = [];
let aiTools = [];

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
 let currentHotboardSource = 'weibo'; // 默认微博热搜


// ========================================
// 页面加载完成后执行初始化
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadBookmarks();
    loadAiTools();
    initTime();
    initSearch();
    initTheme();
    initTodo();
    loadHotboardSource();
    loadHotboard();
    initSettingsModal();
    renderBookmarks();
    renderAiTools();
});

// ========================================
// ⚠️ 【问题根源在这里！！！】
// initTime 函数被定义了【两次】！！！
// JavaScript中后面定义的会覆盖前面的
// ========================================

// ❌ 第一次定义（会被后面的覆盖掉！这就是为什么时间不更新！）
function initTime() {
    updateTime(); // 调用一次更新时间
    setInterval(updateTime, 1000); // 设置定时器：每秒调用updateTime
}

// ✅ 第二次定义（正确的版本，会覆盖上面的）
function initTime() {
    updateTime(); // 页面打开立即显示一次时间
    // 使用 window.setInterval 确保定时器在全局作用域运行
    window.setInterval(function() {
        updateTime(); // 每1000毫秒（1秒）执行一次时间更新
    }, 1000);
}

// ========================================
// 更新时间显示的核心函数
// ========================================
function updateTime() {
    const now = new Date(); // 获取当前系统时间
    
    // 获取时、分、秒，并用 padStart 保证两位数（如 9点 → "09"）
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // 找到页面上显示时间的DOM元素
    const timeEl = document.getElementById('time-display');
    if (timeEl) {
        // 只显示 时:分（所以肉眼看起来每分钟才变一次）
        timeEl.textContent = `${hours}:${minutes}`;
    }
    
    // 星期数组，用于把数字转成中文
    const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    // 获取年、月、日、星期
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 月份从0开始，所以要+1
    const date = now.getDate();
    const week = weeks[now.getDay()]; // getDay()返回0-6，对应周日到周六
    
    // 更新日期显示
    const dateEl = document.getElementById('date-display');
    if (dateEl) {
        dateEl.textContent = `${year}年${month}月${date}日 ${week}`;
    }
}

// ========================================
// 搜索功能相关
// ========================================
function initSearch() {
    // 获取搜索输入框和搜索按钮
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    // 给输入框添加键盘事件：按回车就搜索
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    // 给按钮添加点击事件
    if (searchBtn) searchBtn.addEventListener('click', performSearch);
}

// 执行搜索：跳转到搜索引擎
function performSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput ? searchInput.value.trim() : '';
    
    if (query) {
        // 获取当前选中的搜索引擎配置
        const engine = CONFIG.searchEngines[CONFIG.currentEngine];
        // 打开新标签页搜索
        window.open(engine.url + encodeURIComponent(query), '_blank');
    }
}

// 切换搜索引擎
function setSearchEngine(engine) {
    CONFIG.currentEngine = engine; // 更新配置
    
    // 移除所有按钮的active样式
    document.querySelectorAll('.engine-btn').forEach(btn => btn.classList.remove('active'));
    // 给选中的按钮加上active样式
    const activeBtn = document.querySelector(`[data-engine="${engine}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // 更新页面上"当前搜索引擎"的文字
    const engineName = CONFIG.searchEngines[engine].name;
    const engineHint = document.getElementById('current-engine');
    if (engineHint) engineHint.textContent = engineName;
    
    // 同步设置弹窗里的下拉框
    const defaultEngineSelect = document.getElementById('default-engine');
    if (defaultEngineSelect) defaultEngineSelect.value = engine;
    
    saveSettings(); // 保存到本地存储
}

// ========================================
// 主题切换（浅色/深色/自动）
// ========================================
function initTheme() {
    // 监听系统主题变化：如果用户电脑切换了深浅色，自动跟随
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (CONFIG.currentTheme === 'auto') applyTheme();
    });
}

// 点击月亮/太阳图标切换主题
function toggleDarkMode() {
    const html = document.documentElement;
    // 如果当前是深色就切浅色，反之亦然
    html.classList.contains('dark') ? setTheme('light') : setTheme('dark');
}

// 设置主题
function setTheme(theme) {
    CONFIG.currentTheme = theme;
    
    // 更新按钮状态
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-theme="${theme}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    applyTheme(); // 应用主题
    saveSettings(); // 保存设置
}

// 实际应用主题：给html加/删 dark 类
function applyTheme() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    
    // 判断是否应该用深色模式
    let isDark = CONFIG.currentTheme === 'auto' ?
        window.matchMedia('(prefers-color-scheme: dark)').matches // 自动：跟随系统
        :
        CONFIG.currentTheme === 'dark'; // 手动：用户选择
    
    if (isDark) {
        html.classList.add('dark'); // 加dark类，CSS自动变深色
        if (themeIcon) themeIcon.className = 'fa fa-sun-o'; // 图标变成太阳
    } else {
        html.classList.remove('dark'); // 移除dark类
        if (themeIcon) themeIcon.className = 'fa fa-moon-o'; // 图标变成月亮
    }
}

// ========================================
// 待办事项功能
// ========================================
function initTodo() {
    loadTodos(); // 页面加载时读取本地保存的待办
}

// 添加待办：弹出输入框
function addTodo() {
    const text = prompt('请输入待办事项:');
    if (text && text.trim()) {
        createTodoItem(text.trim(), false); // 创建DOM元素
        saveTodos(); // 保存到本地
    }
}

// 创建单个待办项的DOM
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

// 勾选/取消待办
function toggleTodo(checkbox) {
    const todoItem = checkbox.closest('.todo-item');
    checkbox.checked ? todoItem.classList.add('completed') : todoItem.classList.remove('completed');
    saveTodos();
}

// 保存待办到localStorage（浏览器本地存储，刷新不丢失）
function saveTodos() {
    const todos = [];
    // 遍历所有待办，收集数据
    document.querySelectorAll('#todo-list .todo-item').forEach(item => {
        todos.push({
            text: item.querySelector('.todo-text').textContent,
            completed: item.classList.contains('completed')
        });
    });
    // 转成JSON字符串保存
    localStorage.setItem('todos', JSON.stringify(todos));
}

// 从本地读取待办
function loadTodos() {
    const saved = localStorage.getItem('todos');
    if (saved) {
        try {
            const todos = JSON.parse(saved);
            todos.forEach(todo => createTodoItem(todo.text, todo.completed));
        } catch (e) { console.error('加载待办事项失败:', e); }
    }
}

// ========================================
// 设置弹窗
// ========================================
function initSettingsModal() {
    // 点击遮罩层关闭弹窗
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeSettings();
        });
    }
    // 按ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSettings();
    });
}

function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('active'); // 显示弹窗
        document.body.style.overflow = 'hidden'; // 禁止背景滚动
    }
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('active'); // 隐藏弹窗
        document.body.style.overflow = ''; // 恢复滚动
    }
}

// ========================================
// 本地存储相关
// ========================================
function saveDefaultEngine() {
    const select = document.getElementById('default-engine');
    if (select) setSearchEngine(select.value);
}

// 保存全局设置（搜索引擎、主题）
function saveSettings() {
    const settings = {
        currentEngine: CONFIG.currentEngine,
        currentTheme: CONFIG.currentTheme
    };
    localStorage.setItem('kd-startpage-settings', JSON.stringify(settings));
}

// 加载全局设置
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

// HTML转义：防止用户输入的内容破坏页面
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
/* ========================================
   自定义书签 & AI 工具系统
   ======================================== */

// ========== 默认数据配置 ==========


// ========== 初始化 ==========
// 在原有的 loadSettings() 调用后，书签和AI工具也需要初始化
// 找到 document.addEventListener('DOMContentLoaded', ...) 中的 loadSettings()，在其后添加：
//   loadBookmarks();
//   loadAiTools();
//   renderBookmarks();
//   renderAiTools();

// ========== 书签数据持久化 ==========
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

// ========== AI 工具数据持久化 ==========
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

// ========== 获取并缓存 Favicon ==========
// ========== 获取并缓存 Favicon（失败只尝试一次） ==========


// 短随机延迟 0~300ms，不拖慢总加载
function shortRandomDelay() {
    const ms = Math.floor(Math.random() * 300);
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 带超时的fetch
function fetchWithTimeout(url, timeout = 1500) {
    return Promise.race([
        fetch(url),
        new Promise((_, reject) => setTimeout(() => reject("timeout"), timeout))
    ]);
}

// 单个图标获取：优先UAPI，失败自动降级百度，失败只缓存一次不再重试




async function fetchAndCacheFavicon(item) {
    // 初始化重试次数字段
    if (item.retryCount === undefined) item.retryCount = 0;

    // 已经成功拿到图标，直接返回
    if (item.favicon && item.favicon !== FAVICON_FAILED_FLAG) {
        return item.favicon;
    }

    // 重试次数用尽，永久放弃
    if (item.retryCount >= MAX_RETRY) {
        item.favicon = FAVICON_FAILED_FLAG;
        return '';
    }

    try {
        const domain = new URL(item.url).hostname;
        const faviconUrl = `https://favicone.com/${domain}?s=64`;
        item.favicon = faviconUrl;
        item.retryCount = 0; // 获取成功，重置计数
        return faviconUrl;
    } catch (err) {
        // 本次失败，次数+1
        item.retryCount += 1;
        if (item.retryCount >= MAX_RETRY) {
            item.favicon = FAVICON_FAILED_FLAG;
        }
        return '';
    }
}




// ========== 渲染书签 ==========
// 并发分批加载，全局总超时控制（严格4秒上限）
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
    
    // 全局4秒超时兜底
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

// ========== 添加书签 ==========
function addBookmark() {
    const url = prompt('请输入网站地址（例如 example.com）:');
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

// ========== 删除书签 ==========
function deleteBookmark(index) {
    if (!confirm(`确定要删除「${bookmarks[index].name}」吗？`)) return;
    bookmarks.splice(index, 1);
    saveBookmarks();
    renderBookmarks();
}

// ========== 添加 AI 工具 ==========
function addAiTool() {
    const url = prompt('请输入 AI 工具地址（例如 chat.example.com）:');
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

// ========== 删除 AI 工具 ==========
function deleteAiTool(index) {
    if (!confirm(`确定要删除「${aiTools[index].name}」吗？`)) return;
    aiTools.splice(index, 1);
    saveAiTools();
    renderAiTools();
}

// ========== 管理弹窗（简易版：用 prompt + 列表展示） ==========
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

// 设置背景风格（修复 event 未传参问题）
function setBackground(type, el) {
    document.querySelectorAll('.bg-option').forEach(btn => btn.classList.remove('active'));
    if (el) {
        el.classList.add('active');
    } else if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    localStorage.setItem('background', type);
}


// ========================================
// 小组件拖拽系统（HTML5原生拖拽API）
// ========================================
function initDragSystem() {
    // 给两个容器都添加拖拽功能：小组件区域、大组件区域
    ['widgets-grid', 'large-widgets'].forEach(containerId => {
        const container = document.querySelector('.' + containerId);
        if (!container) return;
        
        let draggedWidget = null; // 当前正在拖拽的元素
        let draggedIndex = null; // 拖拽元素的原始位置
        
        // 给每个小组件加上可拖拽属性
        const widgets = container.querySelectorAll('.widget');
        widgets.forEach((widget, index) => {
            widget.setAttribute('draggable', 'true');
            widget.dataset.index = index;
        });
        
        // 【事件1】开始拖拽
        container.addEventListener('dragstart', (e) => {
            if (!e.target.classList.contains('widget')) return;
            draggedWidget = e.target;
            draggedIndex = parseInt(e.target.dataset.index);
            e.target.classList.add('widget-dragging'); // 加拖拽样式
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => e.target.style.opacity = '0.4', 0); // 半透明
        });
        
        // 【事件2】结束拖拽
        container.addEventListener('dragend', (e) => {
            if (!e.target.classList.contains('widget')) return;
            e.target.classList.remove('widget-dragging');
            e.target.style.opacity = '1';
            container.querySelectorAll('.widget-drag-over').forEach(el => el.classList.remove('widget-drag-over'));
            draggedWidget = null;
            draggedIndex = null;
            saveWidgetOrder(container); // 保存新顺序
        });
        
        // 【事件3】拖拽经过目标（必须preventDefault才能触发drop）
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        // 【事件4】拖拽进入目标元素
        container.addEventListener('dragenter', (e) => {
            e.preventDefault();
            const target = e.target.closest('.widget');
            if (target && target !== draggedWidget) target.classList.add('widget-drag-over');
        });
        
        // 【事件5】拖拽离开目标
        container.addEventListener('dragleave', (e) => {
            const target = e.target.closest('.widget');
            if (target) target.classList.remove('widget-drag-over');
        });
        
        // 【事件6】放下元素（核心：交换位置）
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const target = e.target.closest('.widget');
            if (!target || target === draggedWidget) return;
            target.classList.remove('widget-drag-over');
            
            const targetIndex = parseInt(target.dataset.index);
            const allWidgets = Array.from(container.querySelectorAll('.widget'));
            
            // 根据拖拽方向决定插入位置
            if (draggedIndex < targetIndex) {
                container.insertBefore(allWidgets[draggedIndex], allWidgets[targetIndex].nextSibling);
            } else {
                container.insertBefore(allWidgets[draggedIndex], allWidgets[targetIndex]);
            }
            
            // 重新编号
            container.querySelectorAll('.widget').forEach((widget, index) => {
                widget.dataset.index = index;
            });
        });
    });
}

// 保存小组件顺序
function saveWidgetOrder(container) {
    const order = [];
    container.querySelectorAll('.widget').forEach(widget => {
        order.push(widget.dataset.widgetId || widget.id);
    });
    localStorage.setItem('widgetOrder_' + container.className, JSON.stringify(order));
}
// ========================================
// 热榜功能
// ========================================

// 加载保存的热榜源
function loadHotboardSource() {
    const saved = localStorage.getItem('hotboard-source');
    if (saved && HOTBOARD_SOURCES[saved]) {
        currentHotboardSource = saved;
    }
    // 同步设置弹窗中的下拉框
    const select = document.getElementById('hotboard-source-select');
    if (select) {
        select.value = currentHotboardSource;
    }
    // 更新热榜源名称显示
    updateHotboardSourceName();
}

// 保存热榜源
function saveHotboardSource() {
    const select = document.getElementById('hotboard-source-select');
    if (!select) return;
    
    const source = select.value;
    if (HOTBOARD_SOURCES[source]) {
        currentHotboardSource = source;
        localStorage.setItem('hotboard-source', source);
        updateHotboardSourceName();
        loadHotboard(); // 切换后立即刷新
    }
}

// 更新热榜源名称显示
function updateHotboardSourceName() {
    const nameEl = document.getElementById('hotboard-source-name');
    if (nameEl && HOTBOARD_SOURCES[currentHotboardSource]) {
        nameEl.textContent = HOTBOARD_SOURCES[currentHotboardSource].name;
    }
}


// 加载热榜数据
// 加载热榜数据
async function loadHotboard() {
    const listEl = document.getElementById('hotboard-list');
    const timeEl = document.getElementById('hotboard-update-time');
    const refreshBtn = document.querySelector('[data-widget-id="hotboard"] .widget-add-btn .fa-refresh');
    
    if (!listEl) return;
    
    // 显示加载状态
    listEl.innerHTML = `
        <div class="hotboard-loading">
            <i class="fa fa-spinner fa-spin"></i>
            <span>加载中...</span>
        </div>
    `;
    
    if (refreshBtn) refreshBtn.classList.add('spinning');
    
    // 等待 uapi.js 加载完成（最多等3秒）
    if (typeof GetHotboard !== 'function') {
        await new Promise(resolve => {
            let waited = 0;
            const check = setInterval(() => {
                if (typeof GetHotboard === 'function') {
                    clearInterval(check);
                    resolve();
                } else if (waited >= 3000) {
                    clearInterval(check);
                    resolve();
                }
                waited += 100;
            }, 100);
        });
    }
    
    if (typeof GetHotboard !== 'function') {
        listEl.innerHTML = `
            <div class="hotboard-error">
                <i class="fa fa-exclamation-circle"></i>
                <span>热榜模块加载失败，请刷新页面</span>
            </div>
        `;
        if (refreshBtn) refreshBtn.classList.remove('spinning');
        return;
    }
    
    const data = await GetHotboard(currentHotboardSource);
    
    if (refreshBtn) refreshBtn.classList.remove('spinning');
    
    if (!data || !data.list || data.list.length === 0) {
        listEl.innerHTML = `
            <div class="hotboard-error">
                <i class="fa fa-exclamation-circle"></i>
                <span>暂无热榜数据，请稍后重试</span>
            </div>
        `;
        return;
    }
    
    // 更新时间
    if (timeEl && data.update_time) {
        const timeStr = data.update_time;
        const parts = timeStr.split(' ');
        if (parts.length >= 2) {
            timeEl.textContent = '更新于 ' + parts[1].substring(0, 5);
        }
    }
    
    // 渲染热榜列表
    renderHotboardList(data.list);
}



// SDK 就绪回调（由 uapi.js 在 load 时调用）
function onUapiReady() {
    // 如果热榜还没加载成功，重新加载一次
    const listEl = document.getElementById('hotboard-list');
    if (listEl && listEl.querySelector('.hotboard-error')) {
        loadHotboard();
    }
}


// 渲染热榜列表
function renderHotboardList(list) {
    const listEl = document.getElementById('hotboard-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    // 只显示前15条
    const displayList = list.slice(0, 15);
    
    displayList.forEach((item, index) => {
        const div = document.createElement('a');
        div.className = 'hotboard-item';
        div.href = item.url || '#';
        div.target = '_blank';
        
        // 处理热度值格式化
        let hotValue = '';
        if (item.hot_value) {
            const hot = parseInt(item.hot_value);
            if (hot >= 10000) {
                hotValue = (hot / 10000).toFixed(1) + '万';
            } else {
                hotValue = hot.toString();
            }
        }
        
        // 处理标签（微博的"爆""新""热"等）
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

// 刷新热榜
function refreshHotboard() {
    loadHotboard();
}
