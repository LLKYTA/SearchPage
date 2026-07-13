/* ==========================================
   ui.js - iOS 18 风格统一 UI 组件框架
   UIModal · UISegment · UIDropdown
   标准化接口，易扩展，易维护
   ========================================== */

// ==========================================
// UIModal — 统一弹窗管理
// 用法:
//   const modal = new UIModal(el, { onOpen, onClose, closeOnOverlay, closeOnEscape })
//   modal.open(), modal.close(), modal.toggle()
// ==========================================
class UIModal {
    /**
     * @param {HTMLElement} el      - 模态 overlay 元素
     * @param {Object}      [opts]
     * @param {Function}    [opts.onOpen]          - 打开回调
     * @param {Function}    [opts.onClose]         - 关闭回调
     * @param {boolean}     [opts.closeOnOverlay]  - 点击遮罩关闭 (默认 true)
     * @param {boolean}     [opts.closeOnEscape]   - Escape 键关闭 (默认 true)
     * @param {string}      [opts.closeBtn]        - 关闭按钮选择器 (默认 '.modal-close, .modal-close-btn')
     */
    constructor(el, opts = {}) {
        if (!el) throw new Error('UIModal: el is required');
        this.el = el;
        this.onOpen = opts.onOpen || (() => {});
        this.onClose = opts.onClose || (() => {});
        this.closeOnOverlay = opts.closeOnOverlay !== false;
        this.closeOnEscape = opts.closeOnEscape !== false;
        this.closeBtn = opts.closeBtn || '.modal-close, .modal-close-btn';

        this._bindEvents();
    }

    _bindEvents() {
        // 关闭按钮 + 遮罩点击（事件委托）
        this.el.addEventListener('click', (e) => {
            const btn = e.target.closest(this.closeBtn);
            if (btn) {
                e.preventDefault();
                this.close();
                return;
            }
            if (this.closeOnOverlay && e.target === this.el) {
                this.close();
            }
        });

        // Escape 键（基于 DOM 状态而非内部标记）
        if (this.closeOnEscape) {
            this._escapeHandler = (e) => {
                if (e.key === 'Escape' && this.el.classList.contains('active')) {
                    this.close();
                }
            };
            document.addEventListener('keydown', this._escapeHandler);
        }
    }

    /** 打开弹窗 */
    open() {
        if (this.el.classList.contains('active')) return;
        this.el.classList.add('active');

        // 补偿滚动条宽度，防止 content 偏移
        const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarW > 0) {
            document.body.style.paddingRight = scrollbarW + 'px';
        }
        document.body.style.overflow = 'hidden';
        this.onOpen();
    }

    /** 关闭弹窗（带动画） */
    close(animated = true) {
        if (!this.el.classList.contains('active')) return;

        // 找到内容主体
        const content = this.el.querySelector('.modal-content, .modal-bottom-sheet');
        if (content && animated) {
            const isSheet = content.classList.contains('modal-bottom-sheet');
            content.classList.add(isSheet ? 'sheet-closing' : 'modal-closing');

            // 遮罩淡出
            this.el.style.transition = 'opacity 0.25s ease';
            const bgOpacity = this.el.style.background || 'rgba(0,0,0,0.4)';
            this.el.style.opacity = '0';

            content.addEventListener('animationend', () => {
                this._doClose();
            }, { once: true });

            // 兜底：300ms 后强制关闭（防止 animation 不触发）
            setTimeout(() => {
                if (this.el.classList.contains('active')) this._doClose();
            }, 320);
        } else {
            this._doClose();
        }
    }

    /** 实际关闭逻辑 */
    _doClose() {
        if (!this.el.classList.contains('active')) return;
        this.el.classList.remove('active');

        // 恢复内联样式
        this.el.style.transition = '';
        this.el.style.opacity = '';
        const content = this.el.querySelector('.modal-content, .modal-bottom-sheet');
        if (content) {
            content.classList.remove('modal-closing', 'sheet-closing');
        }

        // 检查是否还有其他模态开着，没有才恢复滚动
        if (!document.querySelector('.modal-overlay.active')) {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }

        this.onClose();
    }

    /** 切换 */
    toggle() {
        this.el.classList.contains('active') ? this.close() : this.open();
    }

    /** 销毁，清理事件 */
    destroy() {
        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
        }
        this.el.innerHTML = '';
    }
}


// ==========================================
// UISegment — 分段选择器（iOS 风格按钮组）
// 用法:
//   new UISegment({
//       el, options: [{value, label?, icon?}],
//       initialValue, onChange
//   })
//   seg.setValue(val, silent), seg.getValue()
// ==========================================
class UISegment {
    /**
     * @param {Object}     opts
     * @param {HTMLElement} opts.el       - 容器元素
     * @param {Array}       opts.options  - [{ value, label?, icon? }]
     * @param {string}      [opts.initialValue] - 初始值
     * @param {Function}    [opts.onChange]     - 选中回调 (value) => void
     */
    constructor(opts = {}) {
        if (!opts.el) throw new Error('UISegment: el is required');
        this.el = opts.el;
        this.options = opts.options || [];
        this.onChange = opts.onChange || (() => {});

        const initVal = opts.initialValue !== undefined
            ? opts.initialValue
            : (this.options[0] || {}).value;
        this.currentValue = initVal;

        this._build();
        this._bindEvents();
    }

    _build() {
        this.el.className = 'ui-segment';
        this.el.innerHTML = this.options.map(opt => {
            const isIconOnly = opt.icon && !opt.label;
            return `
            <button class="ui-segment-item ${isIconOnly ? 'icon-only ' : ''}${opt.value === this.currentValue ? 'active' : ''}"
                    data-value="${opt.value}"
                    ${isIconOnly ? 'title="' + opt.value + '"' : ''}>
                ${opt.icon ? `<i class="fa ${opt.icon}"></i>` : ''}
                ${opt.label || ''}
            </button>`;
        }).join('');
    }

    _bindEvents() {
        this.el.addEventListener('click', (e) => {
            const btn = e.target.closest('.ui-segment-item');
            if (btn) {
                this.setValue(btn.dataset.value);
            }
        });
    }

    /** 设置选中值 */
    setValue(value, silent = false) {
        if (value === this.currentValue) return;
        this.currentValue = value;
        this.el.querySelectorAll('.ui-segment-item').forEach(el => {
            el.classList.toggle('active', el.dataset.value === value);
        });
        if (!silent) this.onChange(value);
    }

    /** 获取当前值 */
    getValue() {
        return this.currentValue;
    }

    /** 更新选项（不改当前值） */
    updateOptions(options) {
        const oldValue = this.currentValue;
        const stillExists = options.some(o => o.value === oldValue);
        this.options = options;
        if (!stillExists) {
            this.currentValue = options.length > 0 ? options[0].value : '';
        }
        this._build();
        if (stillExists) {
            this.el.querySelectorAll('.ui-segment-item').forEach(el => {
                el.classList.toggle('active', el.dataset.value === this.currentValue);
            });
        }
    }

    destroy() {
        this.el.innerHTML = '';
    }
}


// ==========================================
// UIDropdown — 自定义下拉菜单
// 用法:
//   new UIDropdown({
//       el, items: [{value, label, icon?}],
//       initialValue, onChange
//   })
//   dd.setValue(val, silent), dd.getValue()
// ==========================================
class UIDropdown {
    /**
     * @param {Object}     opts
     * @param {HTMLElement} opts.el       - 容器元素
     * @param {Array}       opts.items    - [{value, label, icon?}]
     * @param {string}      [opts.initialValue] - 初始值
     * @param {Function}    [opts.onChange]     - 选中回调 (value) => void
     */
    constructor(opts = {}) {
        if (!opts.el) throw new Error('UIDropdown: el is required');
        this.el = opts.el;
        this.items = opts.items || [];
        this.onChange = opts.onChange || (() => {});
        UIDropdown.instances.push(this);

        const initVal = opts.initialValue !== undefined
            ? opts.initialValue
            : (this.items[0] || {}).value;
        this.currentValue = initVal;
        this.isOpen = false;

        this._build();
        this._bindEvents();
    }

    _build() {
        const current = this.items.find(i => i.value === this.currentValue);

        this.el.innerHTML = `
            <button class="ui-dropdown-btn" type="button">
                ${current && current.icon ? `<i class="fa ${current.icon}"></i>` : ''}
                <span class="ui-dropdown-label">${current ? current.label : ''}</span>
                <i class="fa fa-chevron-down ui-dropdown-chevron"></i>
            </button>
            <div class="ui-dropdown-menu">
                ${this.items.map(item => `
                    <button class="ui-dropdown-item ${item.value === this.currentValue ? 'active' : ''}"
                            type="button" data-value="${item.value}">
                        ${item.icon ? `<i class="fa ${item.icon}"></i>` : ''}
                        ${item.label}
                    </button>
                `).join('')}
            </div>
        `;

        this.btn = this.el.querySelector('.ui-dropdown-btn');
        this.menu = this.el.querySelector('.ui-dropdown-menu');
        this.label = this.el.querySelector('.ui-dropdown-label');
        this.iconEl = this.el.querySelector('.ui-dropdown-btn > .fa:first-child');
    }

    _bindEvents() {
        // 按钮切换
        this.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // 选项点击
        this.menu.addEventListener('click', (e) => {
            const item = e.target.closest('.ui-dropdown-item');
            if (item) this.setValue(item.dataset.value);
        });

        // 外部点击关闭
        this._outsideHandler = (e) => {
            if (!this.el.contains(e.target) && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('click', this._outsideHandler);

        // 键盘关闭
        this._keyHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    }

    /** 设置选中值 */
    setValue(value, silent = false) {
        if (value === this.currentValue) {
            this.close();
            return;
        }
        this.currentValue = value;

        // 更新按钮文字和图标
        const item = this.items.find(i => i.value === value);
        if (item) {
            this.label.textContent = item.label;
            if (this.iconEl) {
                this.iconEl.className = item.icon ? `fa ${item.icon}` : '';
                this.iconEl.style.display = item.icon ? '' : 'none';
            }
        }

        // 更新菜单 active
        this.el.querySelectorAll('.ui-dropdown-item').forEach(el => {
            el.classList.toggle('active', el.dataset.value === value);
        });

        this.close();
        if (!silent) this.onChange(value);
    }

    /** 获取当前值 */
    getValue() {
        return this.currentValue;
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        // 排他关闭：打开当前时关闭所有其他下拉菜单
        UIDropdown.instances.forEach(inst => {
            if (inst !== this) inst.close();
        });
        this.isOpen = true;
        this.menu.classList.add('open');
        this.btn.classList.add('active');
    }

    close() {
        this.isOpen = false;
        this.menu.classList.remove('open');
        this.btn.classList.remove('active');
    }

    /** 更新菜单项（不改当前值） */
    updateItems(items) {
        const oldValue = this.currentValue;
        const stillExists = items.some(i => i.value === oldValue);
        this.items = items;
        if (!stillExists) {
            this.currentValue = items.length > 0 ? items[0].value : '';
        }
        this._build();
        if (stillExists) {
            this.el.querySelectorAll('.ui-dropdown-item').forEach(el => {
                el.classList.toggle('active', el.dataset.value === this.currentValue);
            });
        }
    }

    destroy() {
        document.removeEventListener('click', this._outsideHandler);
        document.removeEventListener('keydown', this._keyHandler);
        const idx = UIDropdown.instances.indexOf(this);
        if (idx >= 0) UIDropdown.instances.splice(idx, 1);
        this.el.innerHTML = '';
    }
}
UIDropdown.instances = [];

// ==========================================
// UINavigationPage — iOS 18 导航式页面切换
// 用于设置等场景的二级导航页面
// 用法:
//   const nav = new UINavigationPage(container)
//   nav.push('page-id')    // 滑入子页面
//   nav.pop()              // 返回上一页
// ==========================================
class UINavigationPage {
    /**
     * @param {HTMLElement} container - 包含 .nav-page-container 的容器
     * @param {Object} [opts]
     * @param {Function} [opts.onPush] - (pageId) => {} 页面推入回调
     * @param {Function} [opts.onPop]  - (pageId) => {} 页面弹出回调
     */
    constructor(container, opts = {}) {
        this.container = container;
        this.onPush = opts.onPush || (() => {});
        this.onPop = opts.onPop || (() => {});
        /** @type {string[]} 页面 ID 栈 */
        this.stack = [];
        /** @type {HTMLElement} 页面容器 */
        this.pageContainer = container.querySelector('.nav-page-container') || this._createContainer();
        this._initStack();
    }

    /** 如果页面容器不存在则创建 */
    _createContainer() {
        const wrap = document.createElement('div');
        wrap.className = 'nav-page-container';
        while (this.container.firstChild) {
            wrap.appendChild(this.container.firstChild);
        }
        this.container.appendChild(wrap);
        return wrap;
    }

    /** 初始化栈：将所有 .nav-page 加入栈，找到 active 的作为当前页 */
    _initStack() {
        const pages = this.pageContainer.querySelectorAll('.nav-page');
        let activeFound = false;
        pages.forEach(p => {
            const id = p.dataset.page;
            if (id) {
                // 已存在的页面入栈
                if (p.classList.contains('active')) {
                    this.stack.push(id);
                    activeFound = true;
                }
            }
        });
        // 没有 active 页，激活第一个
        if (!activeFound && pages.length > 0) {
            const first = pages[0];
            if (first.dataset.page) {
                first.classList.add('active');
                this.stack.push(first.dataset.page);
            }
        }
    }

    /** 获取页面元素 */
    _getPage(id) {
        return this.pageContainer.querySelector(`.nav-page[data-page="${id}"]`);
    }

    /**
     * 推入子页面（当前页滑出到左，新页滑入从右）
     * @param {string} id - 页面 data-page 属性值
     */
    push(id) {
        const page = this._getPage(id);
        if (!page) {
            console.warn(`UINavigationPage: 未找到页面 "${id}"`);
            return;
        }
        const currentId = this.stack[this.stack.length - 1];
        const currentPage = currentId ? this._getPage(currentId) : null;

        // 如果已在栈顶，忽略
        if (currentId === id) return;

        // 当前页滑出到左
        if (currentPage) {
            currentPage.classList.remove('active');
            currentPage.classList.add('slide-left');
        }

        // 新页滑入
        page.classList.remove('slide-right');
        page.classList.add('active');
        this.stack.push(id);
        this.onPush(id);

        // 清理动画类
        setTimeout(() => {
            if (currentPage) currentPage.classList.remove('slide-left');
        }, 400);
    }

    /**
     * 返回到上一页（当前页滑出到右，上一页滑入从左）
     */
    pop() {
        if (this.stack.length <= 1) return;

        const currentId = this.stack.pop();
        const prevId = this.stack[this.stack.length - 1];
        const currentPage = this._getPage(currentId);
        const prevPage = this._getPage(prevId);

        if (currentPage) {
            currentPage.classList.remove('active');
            currentPage.classList.add('slide-right');
        }
        if (prevPage) {
            prevPage.classList.remove('slide-left');
            prevPage.classList.add('active');
        }

        this.onPop(currentId);

        setTimeout(() => {
            if (currentPage) currentPage.classList.remove('slide-right');
        }, 400);
    }

    /** 直接跳转到指定页面（不保留中间历史） */
    goTo(id) {
        const page = this._getPage(id);
        if (!page) return;
        // 隐藏所有
        this.pageContainer.querySelectorAll('.nav-page').forEach(p => {
            p.classList.remove('active', 'slide-left', 'slide-right');
        });
        page.classList.add('active');
        this.stack = [id];
    }

    /** 销毁 */
    destroy() {
        this.stack = [];
        this.pageContainer.innerHTML = '';
    }
}


// ==========================================
// UIToggle — iOS 18 风格胶囊开关
// 用法:
//   new UIToggle({ el, initialValue: true, onChange: (val) => ... })
// ==========================================
class UIToggle {
    /**
     * @param {Object} opts
     * @param {HTMLElement} opts.el          - 容器元素
     * @param {boolean}     [opts.initialValue=false] - 初始开关状态
     * @param {Function}    [opts.onChange]           - (value) => void 回调
     * @param {boolean}     [opts.disabled=false]     - 是否禁用
     */
    constructor(opts = {}) {
        if (!opts.el) throw new Error('UIToggle: el is required');
        this.el = opts.el;
        this.isOn = opts.initialValue !== undefined ? !!opts.initialValue : false;
        this.onChange = opts.onChange || (() => {});
        this.disabled = !!opts.disabled;
        this._build();
        this._bindEvents();
    }

    _build() {
        this.el.innerHTML = `
            <button class="ui-toggle ${this.isOn ? 'on' : ''}" type="button" ${this.disabled ? 'disabled' : ''}>
                <span class="ui-toggle-track">
                    <span class="ui-toggle-thumb"></span>
                </span>
            </button>
        `;
        this.btn = this.el.querySelector('.ui-toggle');
    }

    _bindEvents() {
        this.btn.addEventListener('click', () => {
            if (this.disabled) return;
            this.toggle();
        });
    }

    /**
     * 设置开关状态
     * @param {boolean} value
     * @param {boolean} [silent=false] - 是否静默（不触发 onChange）
     */
    setValue(value, silent = false) {
        const v = !!value;
        if (v === this.isOn) return;
        this.isOn = v;
        this.btn.classList.toggle('on', v);
        if (!silent) this.onChange(v);
    }

    /** 获取当前状态 */
    getValue() {
        return this.isOn;
    }

    /** 切换开关 */
    toggle() {
        this.setValue(!this.isOn);
    }

    /** 启用 */
    enable() {
        this.disabled = false;
        this.btn.removeAttribute('disabled');
    }

    /** 禁用 */
    disable() {
        this.disabled = true;
        this.btn.setAttribute('disabled', '');
    }

    destroy() {
        this.el.innerHTML = '';
    }
}
