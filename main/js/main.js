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

// ========================================
// 页面加载完成后执行初始化
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadSettings(); // 1. 加载本地保存的设置（搜索引擎、主题）
    initTime(); // 2. 初始化时间显示（最重要！）
    initSearch(); // 3. 初始化搜索功能
    initTheme(); // 4. 初始化主题切换
    initTodo(); // 5. 初始化待办事项
    initSettingsModal(); // 6. 初始化设置弹窗
    initDragSystem(); // 7. 初始化小组件拖拽功能
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

// 设置背景风格
function setBackground(type) {
    document.querySelectorAll('.bg-option').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
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