/* ==========================================
   shortcuts.js - 快捷方式小组件
   ========================================== */

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
        window.manageModal?.open();
    }
}
