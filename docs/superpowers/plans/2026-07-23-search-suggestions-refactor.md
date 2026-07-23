# 搜索建议重构实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将搜索建议功能从 `app.js` 抽取为独立的 `SearchSuggestions` 类，同时增强引擎适配器、键盘导航、AbortController 请求中断、TTL 缓存、加载/错误 UI 状态。

**架构：** `SearchSuggestions` 类（`src/js/lib/search-suggestions.js`）包含全部建议逻辑，通过静态 `adapters` 表注册各引擎的建议获取函数。`app.js` 中的 `initSearchSuggestions()` 替换为 `new SearchSuggestions().bind()`。EscapeHTML/RegExp 辅助函数移至全局。

**技术栈：** 纯 ES6+（无框架），fetch API，AbortController，class 私有字段（`#`）。

**文件变更：**
| 文件 | 操作 |
|------|------|
| `src/js/lib/search-suggestions.js` | **新建** — SearchSuggestions 类 + 辅助函数 |
| `index.html` | 添加 `<script>` 引用 |
| `src/js/app/app.js` | 删除旧建议代码 + `escapeRegExp`，替换 `initSearchSuggestions()` |

---

### 任务 1：创建 `SearchSuggestions` 类

**文件：**
- 创建：`src/js/lib/search-suggestions.js`
- 修改：`index.html:395`（添加 script 标签）

- [ ] **步骤 1：创建 `search-suggestions.js` 骨架**

写入文件头部和类骨架：

```javascript
/* ==========================================
   search-suggestions.js — 搜索建议引擎
   ========================================== */

/**
 * 搜索建议 — 带键盘导航、请求中断、TTL 缓存的搜索建议组件
 *
 * 用法：
 *   const ss = new SearchSuggestions(inputEl, overlayEl);
 *   ss.bind();
 */
class SearchSuggestions {
    /** 引擎适配器注册表 engineId -> (query, signal) => Promise<string[]> */
    static adapters = {};

    /** 注册引擎适配器 */
    static registerAdapter(engineId, fn) {
        SearchSuggestions.adapters[engineId] = fn;
    }

    static DEFAULTS = {
        minLength: 2,       // 触发建议的最小字符数
        debounceMs: 200,    // 防抖间隔
        cacheTTL: 120_000,  // 缓存有效期（毫秒）
        maxItems: 8,        // 最多显示条数
    };

    #inputEl;
    #overlayEl;
    #options;
    #cache = new Map();
    #abortController = null;
    #activeIndex = -1;
    #debounceTimer = null;
    #isBound = false;

    constructor(inputEl, overlayEl, options = {}) {
        this.#inputEl = inputEl;
        this.#overlayEl = overlayEl;
        this.#options = { ...SearchSuggestions.DEFAULTS, ...options };
    }
}
```

- [ ] **步骤 2：实现 `#fetch()` — 请求中断 + TTL 缓存**

```javascript
    /**
     * 获取搜索建议（带 AbortController 中断和 TTL 缓存）
     * @param {string} engineId
     * @param {string} query
     * @returns {Promise<string[]>}
     */
    async #fetch(engineId, query) {
        if (!query || query.length < this.#options.minLength) return [];

        const adapter = SearchSuggestions.adapters[engineId];
        if (!adapter) return [];

        const key = `${engineId}:${query}`;
        const cached = this.#cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.#options.cacheTTL) {
            return cached.items;
        }

        // 中断上一个进行中的请求
        if (this.#abortController) this.#abortController.abort();
        this.#abortController = new AbortController();

        try {
            const items = await adapter(query, this.#abortController.signal);
            const trimmed = items.slice(0, this.#options.maxItems);
            this.#cache.set(key, { items: trimmed, timestamp: Date.now() });
            return trimmed;
        } catch (e) {
            if (e.name === 'AbortError') return []; // 被中断，静默
            console.warn('搜索建议请求失败:', e);
            throw e; // 让调用方展示错误状态
        }
    }
```

- [ ] **步骤 3：实现 `#showItems()` `#showLoading()` `#showError()` `hide()`**

```javascript
    /** 显示加载中状态 */
    #showLoading() {
        this.#overlayEl.innerHTML = `
            <div class="search-card-expand-loading">
                <i class="fa fa-spinner fa-spin"></i>
                <span>正在获取建议…</span>
            </div>`;
        this.#overlayEl.style.display = 'block';
        this.#openOverlay();
    }

    /** 显示错误状态（带重试按钮） */
    #showError(msg) {
        this.#overlayEl.innerHTML = `
            <div class="search-card-expand-empty">
                <span style="color:var(--text-tertiary);font-size:12px;">
                    <i class="fa fa-exclamation-triangle"></i> ${escapeHtml(msg)}
                </span>
                <button class="suggestion-item" style="justify-content:center;margin-top:6px;" id="suggest-retry-btn">
                    <i class="fa fa-refresh"></i> 重试
                </button>
            </div>`;
        this.#overlayEl.style.display = 'block';
        this.#openOverlay();
        // 重试按钮：触发当前输入的建议查询
        const retryBtn = this.#overlayEl.querySelector('#suggest-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.#onInput();
            }, { once: true });
        }
    }

    /** 显示建议列表 */
    #showItems(items, query) {
        if (!items || !items.length) {
            this.#overlayEl.innerHTML = `
                <div class="search-card-expand-empty">暂无建议</div>`;
            this.#overlayEl.style.display = 'block';
            this.#openOverlay();
            return;
        }
        const escapedQuery = escapeHtml(query);
        this.#overlayEl.innerHTML = items.map(item => {
            const hl = escapeHtml(item).replace(
                new RegExp(escapeRegExp(query), 'gi'),
                m => `<span class="suggestion-hl">${escapeHtml(m)}</span>`
            );
            return `<button class="suggestion-item" data-query="${escapeHtml(item)}">
                <i class="fa fa-search"></i>
                <span class="suggestion-query">${hl}</span>
            </button>`;
        }).join('');
        this.#overlayEl.style.display = 'block';
        this.#openOverlay();
        this.#activeIndex = -1;

        // 绑定点击事件（取代 onclick）
        this.#overlayEl.querySelectorAll('.suggestion-item').forEach(el => {
            el.addEventListener('click', () => this.#commitSuggestion(el.dataset.query));
        });
    }

    /** 关闭并隐藏建议面板 */
    hide() {
        this.#activeIndex = -1;
        this.#overlayEl.style.display = 'none';
        const overlay = this.#overlayEl.closest('.search-card-expand');
        if (overlay) overlay.classList.remove('open');
    }

    /** 选中建议项 → 填入输入框 → 执行搜索 */
    #commitSuggestion(query) {
        this.#inputEl.value = query;
        this.hide();
        // 调用全局 performSearch
        if (typeof performSearch === 'function') performSearch();
    }

    /** 打开父级 overlay（带 .open class 动画） */
    #openOverlay() {
        const overlay = this.#overlayEl.closest('.search-card-expand');
        if (overlay) overlay.classList.add('open');
    }
```

- [ ] **步骤 4：实现 `#onInput()` — 防抖 + 开关检查 + 调用 fetch**

```javascript
    /** 输入事件处理 */
    #onInput = () => {
        const query = this.#inputEl.value.trim();
        clearTimeout(this.#debounceTimer);

        // 如果输入框正在被程序填充，跳过
        if (this.#inputEl._filling) {
            this.#inputEl._filling = false;
            return;
        }

        if (query.length < this.#options.minLength) {
            this.hide();
            return;
        }

        // 检查设置开关
        const suggestionsEnabled = localStorage.getItem('search-suggestions-enabled') !== 'false';
        if (!suggestionsEnabled) {
            this.hide();
            return;
        }

        this.#showLoading();
        this.#debounceTimer = setTimeout(async () => {
            try {
                const engineId = typeof CONFIG !== 'undefined' ? CONFIG.currentEngine : 'bing';
                const items = await this.#fetch(engineId, query);
                this.#showItems(items, query);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    this.#showError('获取建议失败，点击重试');
                }
            }
        }, this.#options.debounceMs);
    };
```

- [ ] **步骤 5：实现 `#setupKeyboardNav()` — 上下键 + Enter + Esc**

```javascript
    /** 键盘导航：↑↓ 选择、Enter 确认、Esc 关闭 */
    #setupKeyboardNav() {
        this.#inputEl.addEventListener('keydown', (e) => {
            const items = this.#overlayEl.querySelectorAll('.suggestion-item');
            if (!items.length && e.key !== 'Escape') return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (this.#activeIndex < items.length - 1) {
                        this.#activeIndex++;
                    } else {
                        this.#activeIndex = 0;
                    }
                    this.#updateActiveItem(items);
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    if (this.#activeIndex > 0) {
                        this.#activeIndex--;
                    } else {
                        // 回到输入框
                        this.#activeIndex = -1;
                        this.#clearActive(items);
                    }
                    this.#updateActiveItem(items);
                    break;

                case 'Enter':
                    if (this.#activeIndex >= 0 && items[this.#activeIndex]) {
                        e.preventDefault();
                        items[this.#activeIndex].click();
                    }
                    break;

                case 'Escape':
                    this.hide();
                    this.#inputEl.blur();
                    break;
            }
        });
    }

    /** 更新高亮状态 */
    #updateActiveItem(items) {
        items.forEach((el, i) => {
            el.classList.toggle('active', i === this.#activeIndex);
        });
        if (this.#activeIndex >= 0 && items[this.#activeIndex]) {
            items[this.#activeIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    /** 清除所有高亮 */
    #clearActive(items) {
        items.forEach(el => el.classList.remove('active'));
    }
```

- [ ] **步骤 6：实现 `bind()` 和 `destroy()` 生命周期**

```javascript
    /** 绑定事件监听，激活组件 */
    bind() {
        if (this.#isBound) return;
        this.#isBound = true;
        this.#inputEl.addEventListener('input', this.#onInput);
        this.#setupKeyboardNav();
    }

    /** 销毁组件，清理所有监听和缓存 */
    destroy() {
        if (!this.#isBound) return;
        this.#isBound = false;
        this.#inputEl.removeEventListener('input', this.#onInput);
        if (this.#abortController) this.#abortController.abort();
        this.#cache.clear();
        this.hide();
    }
}
```

- [ ] **步骤 7：在文件末尾添加全局 `escapeHtml` 和 `escapeRegExp`**

加在 `SearchSuggestions` 类定义之后：

```javascript
// ========== HTML / 正则转义工具函数（全局） ==========
if (typeof window.escapeHtml !== 'function') {
    window.escapeHtml = function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
}
if (typeof window.escapeRegExp !== 'function') {
    window.escapeRegExp = function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
}
```

- [ ] **步骤 8：在文件末尾注册引擎适配器**

```javascript
// ========== 引擎适配器注册 ==========

// 百度 — 兼容 JSONP 格式
SearchSuggestions.registerAdapter('baidu', async (query, signal) => {
    const url = `https://suggestion.baidu.com/s?wd=${encodeURIComponent(query)}&cb=`;
    const resp = await fetch(url, { signal });
    if (!resp.ok) return [];
    const text = await resp.text();
    const match = text.match(/s:\s*(\[[^\]]+\])/);
    return match ? JSON.parse(match[1]) : [];
});

// Google — 使用 suggestqueries 接口
SearchSuggestions.registerAdapter('google', async (query, signal) => {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
    const resp = await fetch(url, { signal });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data[1] || [];
});

// 其他引擎适配器预留（待后续调研稳定接口）
// SearchSuggestions.registerAdapter('bing', async (query, signal) => { ... });
// SearchSuggestions.registerAdapter('duckduckgo', async (query, signal) => { ... });
```

- [ ] **步骤 9：添加 `<script>` 标签到 `index.html`**

在 `widget-framework.js` 之后、`app.js` 之前（第 397 行附近）插入：

```html
<script src="./src/js/lib/search-suggestions.js"></script>
```

- [ ] **步骤 10：Commit**

```bash
git add src/js/lib/search-suggestions.js index.html
git commit -m "feat: 抽取 SearchSuggestions 类，支持键盘导航、AbortController、TTL 缓存、加载/错误状态"
```

---

### 任务 2：重构 `app.js` — 删除旧代码，集成新类

**文件：**
- 修改：`src/js/app/app.js:262-361,471-473`

- [ ] **步骤 1：删除旧的搜索建议代码**

删除 `app.js` 中从 `// ========== 搜索建议 ==========` 到 `initSearchSuggestions()` 函数结束之间的所有代码（约第 262-361 行），包括：

```javascript
// 删除以下代码块：
// // ========== 搜索建议 ==========
// const SUGGESTION_CACHE = {};
// let suggestTimer = null;
// async function getSuggestions(engineId, query) { ... }
// function showSuggestions(items, query) { ... }
// window.fillSuggestion = function(query) { ... }
// function initSearchSuggestions() { ... }
```

具体要删除的原文：

```
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
    // ... 全部实现 ...
}

function showSuggestions(items, query) {
    // ... 全部实现 ...
}

/** 点击建议项 */
window.fillSuggestion = function(query) {
    // ... 全部实现 ...
};

function initSearchSuggestions() {
    // ... 全部实现 ...
}
```

- [ ] **步骤 2：用新类替换 `initSearchSuggestions()` 调用**

在 `initSearch()` 函数中找到原 `initSearchSuggestions();` 调用（第 180 行），将其替换为：

```javascript
    // 初始化搜索建议 — 用独立的 SearchSuggestions 类替换
    const suggestInput = document.getElementById('search-input');
    const suggestOverlay = document.getElementById('searchSuggestions');
    if (suggestInput && suggestOverlay) {
        window.__searchSuggestions = new SearchSuggestions(suggestInput, suggestOverlay);
        window.__searchSuggestions.bind();
    }
```

- [ ] **步骤 3：删除 `escapeRegExp` 函数（已无调用者）**

在 `app.js` 中找到 `function escapeRegExp(string)`（约第 471 行）并删除。保留 `escapeHtml` 函数（仍在 `showRecentSearches` 中使用）。

删除：

```javascript
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

- [ ] **步骤 4：验证 `escapeHtml` 仍存在于 `app.js`**

确保 `function escapeHtml(text)`（约第 711 行）未被误删。它仍被 `showRecentSearches()` 使用。

- [ ] **步骤 5：Commit**

```bash
git add src/js/app/app.js
git commit -m "refactor: 集成 SearchSuggestions 类，删除旧建议代码和 escapeRegExp"
```

---

### 任务 3：添加 `.active` 样式（键盘导航高亮）

**文件：**
- 修改：`src/css/layout.css`（在 `.search-card-expand .suggestion-item:hover` 之后）

- [ ] **步骤 1：添加 `.suggestion-item.active` 样式**

在 layout.css 中 `.search-card-expand .suggestion-item:hover` 规则之后添加：

```css
.search-card-expand .suggestion-item.active {
    background: var(--bg-tertiary);
    outline: none;
}
```

可选同时添加加载状态微调：

```css
.search-card-expand-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 16px;
    color: var(--text-tertiary);
    font-size: 12px;
}

.search-card-expand-loading .fa-spinner {
    font-size: 14px;
}
```

> 注：加载状态样式可能已存在于 layout.css 第 820-832 行，如果已有则跳过。

- [ ] **步骤 2：Commit**

```bash
git add src/css/layout.css
git commit -m "style: 添加 suggestion-item.active 键盘导航高亮样式"
```

---

### 任务 4：功能验证与 Bump 版本

**文件：**
- 修改：`src/js/lib/version.js`

- [ ] **步骤 1：服务当前页面**

```bash
python3 -m http.server 8080 &
```

- [ ] **步骤 2：验证搜索建议基本流程**

打开 `http://localhost:8080`，验证：
- 输入 `ab` → 出现搜索建议下拉
- 建议项高亮显示匹配文字
- 点击建议项 → 填入输入框 → 跳转搜索结果页

- [ ] **步骤 3：验证键盘导航**

- 输入 `ab` → 按 ↓ 键选中第一个建议项（蓝色高亮）
- 继续按 ↓ 循环到底
- 按 ↑ 回退到输入框
- 选中时按 Enter → 执行搜索
- 按 Esc → 关闭面板，输入框失焦

- [ ] **步骤 4：验证请求中断**

1. 快速输入 `abcdefghij`（连续输入）
2. 打开 DevTools Network 标签
3. 确认只有最后一个请求实际发出，之前的被 abort

- [ ] **步骤 5：验证设置开关**

- 设置 → 搜索设置 → 关闭"搜索建议"
- 输入文字 → 不应出现建议面板
- 重新开启 → 恢复正常

- [ ] **步骤 6：验证错误状态**

- 断开网络或 DevTools 中阻止请求
- 输入 → 显示错误提示 + 重试按钮
- 点击重试 → 重新发起请求

- [ ] **步骤 7：验证缓存**

- 首次输入 `weather` → 有网络请求
- 立即再输入 `weather` 以外的字再删回来 → 应命中缓存，无网络请求
- 等待 2 分钟后 → 缓存过期，重新请求

- [ ] **步骤 8：验证搜索系统重置**

- 触发重置 → 恢复默认设置
- 搜索建议应恢复正常

- [ ] **步骤 9：验证最近搜索不受影响**

- 执行搜索 → 应正常记录到最近搜索
- 点击最近搜索项 → 正常跳转

- [ ] **步骤 10：检查 `escapeHtml` 可用性**

验证 `fillRecentSearch()` 和 `showRecentSearches()` 中的 `escapeHtml` 调用正常工作。

- [ ] **步骤 11：Bump 版本**

```bash
# 运行 version.js 的 bump 逻辑或手动编辑 src/js/lib/version.js
```

- [ ] **步骤 12：Commit**

```bash
git add -A
git commit -m "chore: bump version after search suggestions refactor"
```
