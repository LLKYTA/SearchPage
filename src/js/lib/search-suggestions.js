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
    #boundKeydownHandler = null;

    constructor(inputEl, overlayEl, options = {}) {
        this.#inputEl = inputEl;
        this.#overlayEl = overlayEl;
        this.#options = { ...SearchSuggestions.DEFAULTS, ...options };
    }

    /**
     * 获取搜索建议（带 AbortController 中断和 TTL 缓存）
     * @param {string} engineId
     * @param {string} query
     * @returns {Promise<string[]>}
     */
    async #fetch(engineId, query) {
        if (!query || query.length < this.#options.minLength) return [];

        // 当前引擎无适配器时，回退到百度建议作为通用兜底
        const targetEngine = SearchSuggestions.adapters[engineId] ? engineId : 'baidu';
        const adapter = SearchSuggestions.adapters[targetEngine];
        if (!adapter) return [];

        const key = `${targetEngine}:${query}`;
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
        clearTimeout(this.#debounceTimer);
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
                const currentQuery = this.#inputEl.value.trim();
                // 如果输入已在 debounce 期间变化，丢弃过期结果
                if (currentQuery !== query) return;
                const engineId = typeof CONFIG !== 'undefined' ? CONFIG.currentEngine : 'bing';
                const items = await this.#fetch(engineId, currentQuery);
                // fetch 完成后再次检查输入是否已变化
                if (this.#inputEl.value.trim() !== currentQuery) return;
                this.#showItems(items, currentQuery);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    this.#showError('获取建议失败，点击重试');
                }
            }
        }, this.#options.debounceMs);
    };

    /** 键盘导航：↑↓ 选择、Enter 确认、Esc 关闭 */
    #setupKeyboardNav() {
        this.#boundKeydownHandler = (e) => {
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
                    clearTimeout(this.#debounceTimer);
                    this.hide();
                    this.#inputEl.blur();
                    break;
            }
        };
        this.#inputEl.addEventListener('keydown', this.#boundKeydownHandler);
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
        clearTimeout(this.#debounceTimer);
        this.#inputEl.removeEventListener('input', this.#onInput);
        this.#inputEl.removeEventListener('keydown', this.#boundKeydownHandler);
        if (this.#abortController) this.#abortController.abort();
        this.#cache.clear();
        this.hide();
    }
}

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
