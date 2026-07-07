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
        document.body.style.overflow = 'hidden';
        this.onOpen();
    }

    /** 关闭弹窗 */
    close() {
        if (!this.el.classList.contains('active')) return;
        this.el.classList.remove('active');

        // 检查是否还有其他模态开着，没有才恢复滚动
        if (!document.querySelector('.modal-overlay.active')) {
            document.body.style.overflow = '';
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
        this.el.innerHTML = '';
    }
}
