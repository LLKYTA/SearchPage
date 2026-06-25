/* ==========================================
   所有小组件实现
   每个组件都是一个 Widget 子类，管理自己的数据
   ========================================== */

// ---------- 时间 ----------
class ClockWidget extends Widget {
    static type = 'clock';
    static displayName = '时间';
    static defaultSize = 'sm';
    static icon = 'fa-clock-o';

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = `
            <div class="time-display">00:00</div>
            <div class="date-display">----年--月--日 星期-</div>
        `;
        this._update();
        this.timer = setInterval(() => this._update(), 1000);
    }

    _update() {
        if (!this.element) return;
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        this.element.querySelector('.time-display').textContent = `${h}:${m}`;
        const weeks = ['周日','周一','周二','周三','周四','周五','周六'];
        const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${weeks[now.getDay()]}`;
        this.element.querySelector('.date-display').textContent = dateStr;
    }

    destroy() {
        clearInterval(this.timer);
        super.destroy();
    }
}

// ---------- 天气 ----------
class WeatherWidget extends Widget {
    static type = 'weather';
    static displayName = '天气';
    static defaultSize = 'sm';
    static icon = 'fa-cloud';

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = `
            <div class="weather-content">
                <i class="weather-icon" style="font-style:normal">--</i>
                <div>
                    <div class="weather-temp">加载中</div>
                    <div class="weather-desc">--</div>
                </div>
            </div>
        `;
        this.fetchWeather();
    }

    async fetchWeather() {
        if (typeof GetWeather !== 'function') return;
        const data = await GetWeather();
        if (!data || !this.element) return;
        const emoji = String.fromCodePoint(getWeatherEmoji(data.weather_icon));
        this.element.querySelector('.weather-icon').textContent = emoji;
        this.element.querySelector('.weather-temp').textContent = data.temperature + '℃';
        this.element.querySelector('.weather-desc').textContent = data.weather + '·' + data.city;
    }

    onUpdate() { this.fetchWeather(); }
}

// 天气 emoji 映射
function getWeatherEmoji(code) {
    const map = {
        100: 0x2600, 101: 0x26C5, 102: 0x1F324, 103: 0x26C5, 104: 0x2601,
        150: 0x1F319, 151: 0x1F319, 152: 0x1F319, 153: 0x1F319,
        300: 0x1F326, 301: 0x1F327, 302: 0x26C8, 303: 0x26C8, 304: 0x26C8,
        305: 0x1F327, 306: 0x1F327, 307: 0x1F327, 308: 0x1F327, 309: 0x1F327,
        310: 0x1F30A, 311: 0x1F30A, 312: 0x1F30A, 313: 0x1F974,
        314: 0x1F327, 315: 0x1F327, 316: 0x1F30A, 317: 0x1F30A, 318: 0x1F30A,
        350: 0x1F319, 351: 0x1F319, 399: 0x1F327,
        400: 0x1F328, 401: 0x1F328, 402: 0x2744, 403: 0x2744, 404: 0x1F328,
        405: 0x1F328, 406: 0x1F328, 407: 0x1F328, 408: 0x1F328, 409: 0x2744,
        410: 0x2744, 456: 0x1F319, 457: 0x1F319, 499: 0x2744,
        500: 0x1F32B, 501: 0x1F32B, 502: [0x1F636, 0x200D, 0x1F32B],
        503: 0x1F4A8, 504: 0x1F4A8, 507: 0x1F3DC, 508: 0x1F3DC, 509: 0x1F32B,
        510: 0x1F32B, 511: [0x1F636, 0x200D, 0x1F32B], 512: [0x1F636, 0x200D, 0x1F32B],
        513: [0x1F636, 0x200D, 0x1F32B], 514: 0x1F32B, 515: 0x1F32B,
        800: 0x1F311, 801: 0x1F312, 802: 0x1F313, 803: 0x1F314, 804: 0x1F315,
        805: 0x1F316, 806: 0x1F317, 807: 0x1F318,
        900: 0x1F975, 901: 0x1F976, 999: 0x2753, 9999: 0x26A0
    };
    const emoji = map[code];
    if (!emoji) return 0x2753;
    if (Array.isArray(emoji)) return emoji.reduce((s, c) => s + String.fromCodePoint(c), '');
    return emoji;
}

// ---------- 待办 ----------
class TodoWidget extends Widget {
    static type = 'todo';
    static displayName = '待办事项';
    static defaultSize = 'sm';
    static icon = 'fa-check-square-o';

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = '<div class="todo-list"></div>';
        this._loadTodos();
    }

    _loadTodos() {
        const todos = JSON.parse(localStorage.getItem('todos') || '[]');
        const list = this.element.querySelector('.todo-list');
        list.innerHTML = '';
        todos.forEach((todo, idx) => {
            const div = document.createElement('div');
            div.className = 'todo-item' + (todo.completed ? ' completed' : '');
            div.innerHTML = `
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
            `;
            div.querySelector('.todo-checkbox').addEventListener('change', (e) => {
                this.toggleTodo(idx, e.target.checked);
            });
            list.appendChild(div);
        });
    }

    toggleTodo(index, checked) {
        const todos = JSON.parse(localStorage.getItem('todos') || '[]');
        if (todos[index]) {
            todos[index].completed = checked;
            localStorage.setItem('todos', JSON.stringify(todos));
            this._loadTodos();
        }
    }

    openManager() {
        const todos = JSON.parse(localStorage.getItem('todos') || '[]');
        window.currentManageWidget = this;
        document.getElementById('manage-modal-title').textContent = '管理待办事项';
        const container = document.getElementById('manage-list-container');
        container.innerHTML = '';
        todos.forEach((todo, idx) => {
            const row = document.createElement('div');
            row.className = 'manage-row';
            row.innerHTML = `
                <input type="text" class="manage-input" value="${escapeHtml(todo.text)}" placeholder="待办内容">
                <button class="manage-delete-btn"><i class="fa fa-trash"></i></button>
            `;
            const input = row.querySelector('.manage-input');
            input.addEventListener('input', () => {
                todos[idx].text = input.value;
                localStorage.setItem('todos', JSON.stringify(todos));
            });
            row.querySelector('.manage-delete-btn').addEventListener('click', () => {
                todos.splice(idx, 1);
                localStorage.setItem('todos', JSON.stringify(todos));
                this.openManager(); // 刷新
            });
            container.appendChild(row);
        });
        document.getElementById('manage-modal').classList.add('active');
    }
}

// ---------- 书签 ----------
class BookmarksWidget extends Widget {
    static type = 'bookmarks';
    static displayName = '常用书签';
    static defaultSize = 'md';
    static icon = 'fa-bookmark';

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = '<div class="bookmarks-grid"></div>';
        this._renderBookmarks();
    }

    _renderBookmarks() {
        const bookmarks = JSON.parse(localStorage.getItem('custom-bookmarks') || '[]');
        const grid = this.element.querySelector('.bookmarks-grid');
        grid.innerHTML = '';
        bookmarks.forEach((bm, idx) => {
            const a = document.createElement('a');
            a.href = bm.url;
            a.target = '_blank';
            a.className = 'bookmark-item';
            a.innerHTML = `
                <div class="bookmark-icon"><i class="fa fa-globe"></i></div>
                <span class="bookmark-name">${escapeHtml(bm.name)}</span>
                <button class="bookmark-delete-btn" onclick="event.preventDefault(); event.stopPropagation();"><i class="fa fa-times"></i></button>
            `;
            a.querySelector('.bookmark-delete-btn').addEventListener('click', () => {
                bookmarks.splice(idx, 1);
                localStorage.setItem('custom-bookmarks', JSON.stringify(bookmarks));
                this._renderBookmarks();
            });
            grid.appendChild(a);
        });
    }

    openManager() {
        const bookmarks = JSON.parse(localStorage.getItem('custom-bookmarks') || '[]');
        window.currentManageWidget = this;
        document.getElementById('manage-modal-title').textContent = '管理书签';
        const container = document.getElementById('manage-list-container');
        container.innerHTML = '';
        bookmarks.forEach((bm, idx) => {
            const row = document.createElement('div');
            row.className = 'manage-row';
            row.innerHTML = `
                <input type="text" class="manage-input" value="${escapeHtml(bm.name)}" placeholder="名称">
                <input type="text" class="manage-input" value="${escapeHtml(bm.url)}" placeholder="网址">
                <button class="manage-delete-btn"><i class="fa fa-trash"></i></button>
            `;
            const [nameInput, urlInput] = row.querySelectorAll('.manage-input');
            nameInput.addEventListener('input', () => {
                bm.name = nameInput.value;
                localStorage.setItem('custom-bookmarks', JSON.stringify(bookmarks));
            });
            urlInput.addEventListener('input', () => {
                bm.url = urlInput.value;
                localStorage.setItem('custom-bookmarks', JSON.stringify(bookmarks));
            });
            row.querySelector('.manage-delete-btn').addEventListener('click', () => {
                bookmarks.splice(idx, 1);
                localStorage.setItem('custom-bookmarks', JSON.stringify(bookmarks));
                this.openManager();
            });
            container.appendChild(row);
        });
        document.getElementById('manage-modal').classList.add('active');
    }
}

// ---------- AI 工具 ----------
class AiToolsWidget extends Widget {
    static type = 'ai-tools';
    static displayName = 'AI 助手';
    static defaultSize = 'md';
    static icon = 'fa-lightbulb-o';

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = '<div class="ai-tools-grid"></div>';
        this._render();
    }

    _render() {
        const tools = JSON.parse(localStorage.getItem('custom-ai-tools') || '[]');
        const grid = this.element.querySelector('.ai-tools-grid');
        grid.innerHTML = '';
        tools.forEach((t, idx) => {
            const a = document.createElement('a');
            a.href = t.url;
            a.target = '_blank';
            a.className = 'ai-tool-item';
            a.innerHTML = `
                <div class="ai-tool-icon"><i class="fa fa-robot"></i></div>
                <span class="ai-tool-name">${escapeHtml(t.name)}</span>
                <button class="ai-tool-delete-btn" onclick="event.preventDefault(); event.stopPropagation();"><i class="fa fa-times"></i></button>
            `;
            a.querySelector('.ai-tool-delete-btn').addEventListener('click', () => {
                tools.splice(idx, 1);
                localStorage.setItem('custom-ai-tools', JSON.stringify(tools));
                this._render();
            });
            grid.appendChild(a);
        });
    }

    openManager() {
        const tools = JSON.parse(localStorage.getItem('custom-ai-tools') || '[]');
        window.currentManageWidget = this;
        document.getElementById('manage-modal-title').textContent = '管理AI工具';
        const container = document.getElementById('manage-list-container');
        container.innerHTML = '';
        tools.forEach((t, idx) => {
            const row = document.createElement('div');
            row.className = 'manage-row';
            row.innerHTML = `
                <input type="text" class="manage-input" value="${escapeHtml(t.name)}" placeholder="名称">
                <input type="text" class="manage-input" value="${escapeHtml(t.url)}" placeholder="网址">
                <button class="manage-delete-btn"><i class="fa fa-trash"></i></button>
            `;
            const [nameInput, urlInput] = row.querySelectorAll('.manage-input');
            nameInput.addEventListener('input', () => {
                t.name = nameInput.value;
                localStorage.setItem('custom-ai-tools', JSON.stringify(tools));
            });
            urlInput.addEventListener('input', () => {
                t.url = urlInput.value;
                localStorage.setItem('custom-ai-tools', JSON.stringify(tools));
            });
            row.querySelector('.manage-delete-btn').addEventListener('click', () => {
                tools.splice(idx, 1);
                localStorage.setItem('custom-ai-tools', JSON.stringify(tools));
                this.openManager();
            });
            container.appendChild(row);
        });
        document.getElementById('manage-modal').classList.add('active');
    }
}

// ---------- 快捷方式 ----------
class ShortcutsWidget extends Widget {
    static type = 'shortcuts';
    static displayName = '快捷方式';
    static defaultSize = 'sm';
    static icon = 'fa-th';

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = '<div class="shortcuts-grid"></div>';
        this._render();
    }

    _render() {
        const shortcuts = JSON.parse(localStorage.getItem('custom-shortcuts') || '[]');
        const grid = this.element.querySelector('.shortcuts-grid');
        grid.innerHTML = '';
        shortcuts.forEach((s, idx) => {
            const a = document.createElement('a');
            a.href = s.url;
            a.target = '_blank';
            a.className = 'shortcut-item';
            a.innerHTML = `
                <div class="shortcut-icon" style="background:${s.color || '#999'}">
                    <i class="fa ${s.icon || 'fa-external-link'}"></i>
                </div>
                <span class="shortcut-name">${escapeHtml(s.name)}</span>
                <button class="shortcut-delete-btn" onclick="event.preventDefault(); event.stopPropagation();"><i class="fa fa-times"></i></button>
            `;
            a.querySelector('.shortcut-delete-btn').addEventListener('click', () => {
                shortcuts.splice(idx, 1);
                localStorage.setItem('custom-shortcuts', JSON.stringify(shortcuts));
                this._render();
            });
            grid.appendChild(a);
        });
    }

    openManager() {
        const shortcuts = JSON.parse(localStorage.getItem('custom-shortcuts') || '[]');
        window.currentManageWidget = this;
        document.getElementById('manage-modal-title').textContent = '管理快捷方式';
        const container = document.getElementById('manage-list-container');
        container.innerHTML = '';
        shortcuts.forEach((s, idx) => {
            const row = document.createElement('div');
            row.className = 'manage-row';
            row.innerHTML = `
                <input type="text" class="manage-input" value="${escapeHtml(s.name)}" placeholder="名称">
                <input type="text" class="manage-input" value="${escapeHtml(s.url)}" placeholder="网址">
                <input type="text" class="manage-input" value="${escapeHtml(s.color || '#999')}" placeholder="颜色">
                <input type="text" class="manage-input" value="${escapeHtml(s.icon || 'fa-external-link')}" placeholder="图标类">
                <button class="manage-delete-btn"><i class="fa fa-trash"></i></button>
            `;
            const inputs = row.querySelectorAll('.manage-input');
            inputs[0].addEventListener('input', () => { s.name = inputs[0].value; localStorage.setItem('custom-shortcuts', JSON.stringify(shortcuts)); });
            inputs[1].addEventListener('input', () => { s.url = inputs[1].value; localStorage.setItem('custom-shortcuts', JSON.stringify(shortcuts)); });
            inputs[2].addEventListener('input', () => { s.color = inputs[2].value; localStorage.setItem('custom-shortcuts', JSON.stringify(shortcuts)); });
            inputs[3].addEventListener('input', () => { s.icon = inputs[3].value; localStorage.setItem('custom-shortcuts', JSON.stringify(shortcuts)); });
            row.querySelector('.manage-delete-btn').addEventListener('click', () => {
                shortcuts.splice(idx, 1);
                localStorage.setItem('custom-shortcuts', JSON.stringify(shortcuts));
                this.openManager();
            });
            container.appendChild(row);
        });
        document.getElementById('manage-modal').classList.add('active');
    }
}

// ---------- 热榜 ----------
class HotboardWidget extends Widget {
    static type = 'hotboard';
    static displayName = '热榜';
    static defaultSize = 'md';
    static icon = 'fa-fire';

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = `
            <div class="hotboard-meta">
                <span class="hotboard-source-tag">加载中</span>
                <span class="hotboard-time"></span>
            </div>
            <div class="hotboard-list"></div>
        `;
        this.loadHotboard();
    }

    async loadHotboard() {
        const source = localStorage.getItem('hotboard-source') || 'weibo';
        const sourceInfo = {
            weibo: '微博热搜', zhihu: '知乎热榜', bilibili: 'B站热门', baidu: '百度热搜',
            douyin: '抖音热榜', toutiao: '今日头条', '36kr': '36氪', hupu: '虎扑'
        };
        this.element.querySelector('.hotboard-source-tag').textContent = sourceInfo[source] || source;
        if (typeof GetHotboard !== 'function') return;
        const data = await GetHotboard(source);
        if (!data || !data.list || !this.element) return;
        const listEl = this.element.querySelector('.hotboard-list');
        listEl.innerHTML = '';
        data.list.slice(0, 15).forEach((item, idx) => {
            const a = document.createElement('a');
            a.href = item.url || '#';
            a.target = '_blank';
            a.className = 'hotboard-item';
            let hotValue = '';
            if (item.hot_value) {
                const hot = parseInt(item.hot_value);
                hotValue = hot >= 10000 ? (hot / 10000).toFixed(1) + '万' : hot.toString();
            }
            a.innerHTML = `
                <div class="hotboard-rank">${idx+1}</div>
                <span class="hotboard-title">${escapeHtml(item.title)}</span>
                ${hotValue ? `<span class="hotboard-hot"><i class="fa fa-fire"></i>${hotValue}</span>` : ''}
            `;
            listEl.appendChild(a);
        });
    }

    onUpdate() { this.loadHotboard(); }
}