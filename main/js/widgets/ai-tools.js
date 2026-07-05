/* ==========================================
   ai-tools.js - AI 智能助手小组件
   ========================================== */

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
