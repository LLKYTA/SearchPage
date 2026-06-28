/* ==========================================
   所有小组件实现（含尺寸差异化适配）
   ========================================== */

// ---------- 辅助：天气 emoji 映射 ----------
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

// ========== 时间（尺寸统一，无变化） ==========
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
        if (this.timer) clearInterval(this.timer);
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

// ========== 天气（已适配，保持不变） ==========
class WeatherWidget extends Widget {
    static type = 'weather';
    static displayName = '天气';
    static defaultSize = 'sm';
    static icon = 'fa-cloud';

    constructor(container, index) {
        super(container, index);
        this.weatherData = null;
    }

    render() {
        if (this.weatherData) {
            this._renderBySize(this.currentSize);
        } else {
            const content = this.element.querySelector('.widget-content');
            content.innerHTML = `<div class="weather-content">
                <i class="weather-icon" style="font-style:normal">--</i>
                <div>
                    <div class="weather-temp">加载中</div>
                    <div class="weather-desc">--</div>
                </div>
            </div>`;
            this.fetchWeather();
        }
    }

    onResize(newSize) {
        if (this.weatherData) this._renderBySize(newSize);
    }

    async fetchWeather() {
        if (typeof GetWeather !== 'function') return;
        const data = await GetWeather();
        if (!data || !this.element) return;
        this.weatherData = data;
        this._renderBySize(this.currentSize);
    }

    _renderBySize(size) {
        const data = this.weatherData;
        const content = this.element.querySelector('.widget-content');
        if (!content) return;
        const emoji = String.fromCodePoint(getWeatherEmoji(data.weather_icon));
        const temp = data.temperature;
        const desc = data.weather;
        const city = data.city || '';
        const feel = data.feels_like;
        const humidity = data.humidity;
        const wind = `${data.wind_direction || ''} ${data.wind_power || ''}`.trim();
        const aqi = data.aqi;
        const aqiLevel = data.aqi_category || '';
        const uv = data.uv;

        if (size === 'sm') {
            content.innerHTML = `<div class="weather-content">
                <i class="weather-icon" style="font-style:normal">${emoji}</i>
                <div>
                    <div class="weather-temp">${temp}℃</div>
                    <div class="weather-desc">${desc}</div>
                </div>
            </div>`;
        } else if (size === 'md') {
            content.innerHTML = `<div class="weather-content">
                <i class="weather-icon" style="font-style:normal; font-size:40px">${emoji}</i>
                <div>
                    <div class="weather-temp" style="font-size:32px">${temp}℃</div>
                    <div class="weather-desc">${desc} · ${city}</div>
                    <div style="font-size:12px; margin-top:4px;">体感 ${feel}℃</div>
                    ${aqi ? `<div style="font-size:12px;">AQI ${aqi} ${aqiLevel}</div>` : ''}
                </div>
            </div>`;
        } else {
            content.innerHTML = `<div style="text-align:center;">
                <i class="weather-icon" style="font-size:48px; display:block;">${emoji}</i>
                <div class="weather-temp" style="font-size:48px;">${temp}℃</div>
                <div class="weather-desc" style="font-size:16px;">${desc}</div>
                <div style="font-size:13px; margin-top:8px;">
                    <span>📍 ${city}</span>
                    ${feel ? `<span style="margin-left:12px;">🌡️ 体感 ${feel}℃</span>` : ''}
                </div>
                <div style="font-size:12px; margin-top:6px;">
                    ${wind ? `<span>🌬 ${wind}</span>` : ''}
                    ${humidity ? `<span style="margin-left:12px;">💧 ${humidity}%</span>` : ''}
                    ${uv ? `<span style="margin-left:12px;">☀️ UV ${uv}</span>` : ''}
                </div>
                ${aqi ? `<div style="font-size:12px; margin-top:6px;">空气质量：${aqi} ${aqiLevel}</div>` : ''}
            </div>`;
        }
    }

    onUpdate() { this.fetchWeather(); }
}

// ========== 待办（尺寸差异化 + 头部添加按钮） ==========
class TodoWidget extends Widget {
    static type = 'todo';
    static displayName = '待办事项';
    static defaultSize = 'sm';
    static icon = 'fa-check-square-o';

    render() {
        // 添加头部“+”按钮
        this._addHeaderAddBtn();

        const content = this.element.querySelector('.widget-content');
        content.innerHTML = '<div class="todo-list"></div>';
        this._loadTodos();
    }

    _addHeaderAddBtn() {
        const header = this.element.querySelector('.widget-header');
        if (!header) return;
        let actions = header.querySelector('.widget-header-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'widget-header-actions';
            header.appendChild(actions);
        }
        // 避免重复添加
        if (actions.querySelector('.widget-header-add-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'widget-header-add-btn';
        btn.title = '添加待办';
        btn.innerHTML = '<i class="fa fa-plus"></i>';
        btn.style.cssText = 'background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;padding:4px;transition:color 0.2s;';
        btn.addEventListener('mouseenter', () => btn.style.color = 'var(--ios-blue)');
        btn.addEventListener('mouseleave', () => btn.style.color = 'var(--text-secondary)');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openManager();
        });
        actions.prepend(btn);
    }

    _loadTodos() {
        const todos = JSON.parse(localStorage.getItem('todos') || '[]');
        const list = this.element.querySelector('.todo-list');
        if (!list) return;
        list.innerHTML = '';
        const max = this.currentSize === 'sm' ? 3 : this.currentSize === 'md' ? 5 : todos.length;
        const displayed = todos.slice(0, max);

        displayed.forEach((todo, idx) => {
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
                this.openManager();
            });
            container.appendChild(row);
        });
        document.getElementById('manage-modal').classList.add('active');
    }
}

// ========== 书签（尺寸差异化 + 头部添加按钮） ==========
class BookmarksWidget extends Widget {
    static type = 'bookmarks';
    static displayName = '常用书签';
    static defaultSize = 'md';
    static icon = 'fa-bookmark';

    render() {
        this._addHeaderAddBtn();
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = '<div class="bookmarks-grid"></div>';
        this._renderBookmarks();
    }

    _addHeaderAddBtn() {
        const header = this.element.querySelector('.widget-header');
        if (!header) return;
        let actions = header.querySelector('.widget-header-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'widget-header-actions';
            header.appendChild(actions);
        }
        if (actions.querySelector('.widget-header-add-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'widget-header-add-btn';
        btn.title = '添加书签';
        btn.innerHTML = '<i class="fa fa-plus"></i>';
        btn.style.cssText = 'background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;padding:4px;transition:color 0.2s;';
        btn.addEventListener('mouseenter', () => btn.style.color = 'var(--ios-blue)');
        btn.addEventListener('mouseleave', () => btn.style.color = 'var(--text-secondary)');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openManager();
        });
        actions.prepend(btn);
    }

    _renderBookmarks() {
        const bookmarks = JSON.parse(localStorage.getItem('custom-bookmarks') || '[]');
        const grid = this.element.querySelector('.bookmarks-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const size = this.currentSize;
        const cols = size === 'sm' ? 2 : size === 'md' ? 3 : 4;
        const max = size === 'sm' ? 4 : size === 'md' ? 6 : 8;
        const displayed = bookmarks.slice(0, max);
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        displayed.forEach((bm, idx) => {
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

// ========== AI 工具（尺寸差异化 + 头部添加按钮） ==========
class AiToolsWidget extends Widget {
    static type = 'ai-tools';
    static displayName = 'AI 助手';
    static defaultSize = 'md';
    static icon = 'fa-lightbulb-o';

    render() {
        this._addHeaderAddBtn();
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = '<div class="ai-tools-grid"></div>';
        this._render();
    }

    _addHeaderAddBtn() {
        const header = this.element.querySelector('.widget-header');
        if (!header) return;
        let actions = header.querySelector('.widget-header-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'widget-header-actions';
            header.appendChild(actions);
        }
        if (actions.querySelector('.widget-header-add-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'widget-header-add-btn';
        btn.title = '添加AI工具';
        btn.innerHTML = '<i class="fa fa-plus"></i>';
        btn.style.cssText = 'background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;padding:4px;transition:color 0.2s;';
        btn.addEventListener('mouseenter', () => btn.style.color = 'var(--ios-blue)');
        btn.addEventListener('mouseleave', () => btn.style.color = 'var(--text-secondary)');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openManager();
        });
        actions.prepend(btn);
    }

    _render() {
        const tools = JSON.parse(localStorage.getItem('custom-ai-tools') || '[]');
        const grid = this.element.querySelector('.ai-tools-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const size = this.currentSize;
        const cols = size === 'sm' ? 2 : size === 'md' ? 2 : 3;
        const max = size === 'sm' ? 4 : size === 'md' ? 6 : 9;
        const displayed = tools.slice(0, max);
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        displayed.forEach((t, idx) => {
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

// ========== 快捷方式（尺寸差异化 + 头部添加按钮） ==========
class ShortcutsWidget extends Widget {
    static type = 'shortcuts';
    static displayName = '快捷方式';
    static defaultSize = 'sm';
    static icon = 'fa-th';

    render() {
        this._addHeaderAddBtn();
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = '<div class="shortcuts-grid"></div>';
        this._render();
    }

    _addHeaderAddBtn() {
        const header = this.element.querySelector('.widget-header');
        if (!header) return;
        let actions = header.querySelector('.widget-header-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'widget-header-actions';
            header.appendChild(actions);
        }
        if (actions.querySelector('.widget-header-add-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'widget-header-add-btn';
        btn.title = '添加快捷方式';
        btn.innerHTML = '<i class="fa fa-plus"></i>';
        btn.style.cssText = 'background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;padding:4px;transition:color 0.2s;';
        btn.addEventListener('mouseenter', () => btn.style.color = 'var(--ios-blue)');
        btn.addEventListener('mouseleave', () => btn.style.color = 'var(--text-secondary)');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openManager();
        });
        actions.prepend(btn);
    }

    _render() {
        const shortcuts = JSON.parse(localStorage.getItem('custom-shortcuts') || '[]');
        const grid = this.element.querySelector('.shortcuts-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const size = this.currentSize;
        const cols = size === 'sm' ? 2 : size === 'md' ? 3 : 4;
        const max = size === 'sm' ? 4 : size === 'md' ? 6 : 8;
        const displayed = shortcuts.slice(0, max);
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        displayed.forEach((s, idx) => {
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

// ========== 热榜（尺寸差异化） ==========
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
        const size = this.currentSize;
        const max = size === 'sm' ? 5 : size === 'md' ? 10 : 15;
        const displayed = data.list.slice(0, max);

        displayed.forEach((item, idx) => {
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
                ${hotValue && size !== 'sm' ? `<span class="hotboard-hot"><i class="fa fa-fire"></i>${hotValue}</span>` : ''}
            `;
            listEl.appendChild(a);
        });
    }

    onUpdate() { this.loadHotboard(); }
}

// ========== 时间进度条（尺寸差异化） ==========
class TimeProgressWidget extends Widget {
    static type = 'time-progress';
    static displayName = '时间进度条';
    static defaultSize = 'sm';
    static icon = 'fa-hourglass-half';

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = '';
        this.updateProgress();
        if (this.todayTimer) clearInterval(this.todayTimer);
        if (this.otherTimer) clearInterval(this.otherTimer);
        this.todayTimer = setInterval(() => this.updateTodayProgress(), 1000);
        this.otherTimer = setInterval(() => this.updateWeekYearProgress(), 60000);
    }

    updateProgress() {
        this.updateTodayProgress();
        this.updateWeekYearProgress();
    }

    updateTodayProgress() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const elapsed = (now - startOfDay) / 1000;
        const total = 24 * 60 * 60;
        const percent = Math.min(100, Math.floor((elapsed / total) * 100));
        this.setProgress('today', percent);
    }

    updateWeekYearProgress() {
        const now = new Date();
        const dayOfWeek = now.getDay() || 7;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
        startOfWeek.setHours(0,0,0,0);
        const weekElapsed = (now - startOfWeek) / 1000;
        const weekTotal = 7 * 24 * 60 * 60;
        const weekPercent = Math.min(100, Math.floor((weekElapsed / weekTotal) * 100));
        this.setProgress('week', weekPercent);

        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const yearElapsed = (now - startOfYear) / 1000;
        const isLeap = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0;
        const yearTotal = (isLeap ? 366 : 365) * 24 * 60 * 60;
        const yearPercent = Math.min(100, Math.floor((yearElapsed / yearTotal) * 100));
        this.setProgress('year', yearPercent);
    }

    setProgress(type, percent) {
        const content = this.element.querySelector('.widget-content');
        if (!content) return;

        let types = [];
        if (this.currentSize === 'sm') {
            types = ['today'];
        } else if (this.currentSize === 'md') {
            types = ['today', 'week'];
        } else {
            types = ['today', 'week', 'year'];
        }

        if (!content.dataset.initialized || content.dataset.size !== this.currentSize) {
            content.innerHTML = '';
            types.forEach(t => {
                const item = document.createElement('div');
                item.className = 'progress-item';
                item.innerHTML = `
                    <div class="progress-label">
                        <span>${t === 'today' ? '今日' : t === 'week' ? '本周' : '今年'}</span>
                        <span class="progress-percent" id="${t}-percent">0%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${t}-fill" id="${t}-fill" style="width: 0%"></div>
                    </div>
                `;
                content.appendChild(item);
            });
            content.dataset.initialized = 'true';
            content.dataset.size = this.currentSize;
        }

        const percentEl = content.querySelector(`#${type}-percent`);
        const fillEl = content.querySelector(`#${type}-fill`);
        if (percentEl) percentEl.textContent = percent + '%';
        if (fillEl) fillEl.style.width = percent + '%';
    }

    destroy() {
        clearInterval(this.todayTimer);
        clearInterval(this.otherTimer);
        super.destroy();
    }
}
// ========== 每日单词（尺寸差异化） ==========
class DailyWordWidget extends Widget {
    static type = 'daily-word';
    static displayName = '每日单词';
    static defaultSize = 'sm';
    static icon = 'fa-book';
    static maxPerArea = 1; // 每个区域最多1个

    constructor(container, index) {
        super(container, index);
        this.data = null;
        this.isLoading = false;
    }

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = `<div class="dailyword-loading"><i class="fa fa-spinner fa-spin"></i> 加载中...</div>`;
        this.fetchWord();
    }

    onResize(newSize) {
        if (this.data) {
            this._renderBySize(newSize);
        } else {
            this.render();
        }
    }

    async fetchWord() {
        if (this.isLoading) return;
        this.isLoading = true;
        const category = localStorage.getItem('dailyword-category') || 'all';
        const data = await GetDailyWord(category);
        this.isLoading = false;

        if (!data || !data.words || data.words.length === 0) {
            this._renderError();
            return;
        }
        this.data = data.words[0];
        this._renderBySize(this.currentSize);
    }

    _renderError() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = `
            <div class="dailyword-error" style="text-align:center;color:var(--text-secondary);padding:16px;cursor:pointer;">
                <i class="fa fa-refresh" style="display:block;font-size:20px;margin-bottom:6px;"></i>
                点击重试
            </div>
        `;
        content.querySelector('.dailyword-error')?.addEventListener('click', () => this.fetchWord());
    }

    _renderBySize(size) {
        if (!this.data) return;
        const content = this.element.querySelector('.widget-content');
        const word = this.data;
        const phonetic = word.phonetic || '';
        const definition = word.definition || '';
        const examples = word.examples || [];

        if (size === 'sm') {
            content.innerHTML = `
                <div class="dailyword-sm">
                    <div class="dailyword-word">${escapeHtml(word.word)}</div>
                    <div class="dailyword-def">${escapeHtml(definition)}</div>
                </div>
            `;
        } else if (size === 'md') {
            content.innerHTML = `
                <div class="dailyword-md">
                    <div class="dailyword-word">${escapeHtml(word.word)}</div>
                    <div class="dailyword-phonetic">${escapeHtml(phonetic)}</div>
                    <div class="dailyword-def">${escapeHtml(definition)}</div>
                    ${examples.length > 0 ? `<div class="dailyword-example">“${escapeHtml(examples[0].text)}”</div>` : ''}
                </div>
            `;
        } else {
            // lg
            let examplesHtml = '';
            if (examples.length > 0) {
                examplesHtml = examples.map(ex => `
                    <div class="dailyword-example-item">
                        <div class="dailyword-example-text">“${escapeHtml(ex.text)}”</div>
                        ${ex.translation ? `<div class="dailyword-example-trans">${escapeHtml(ex.translation)}</div>` : ''}
                    </div>
                `).join('');
            }
            content.innerHTML = `
                <div class="dailyword-lg">
                    <div class="dailyword-word">${escapeHtml(word.word)}</div>
                    <div class="dailyword-phonetic">${escapeHtml(phonetic)}</div>
                    <div class="dailyword-def">${escapeHtml(definition)}</div>
                    ${examplesHtml ? `<div class="dailyword-examples">${examplesHtml}</div>` : ''}
                    <div class="dailyword-source" style="font-size:11px;color:var(--text-tertiary);margin-top:10px;text-align:right;">
                        词库: ${localStorage.getItem('dailyword-category') || 'all'}
                    </div>
                </div>
            `;
        }
    }

    onUpdate() {
        this.fetchWord();
    }
}