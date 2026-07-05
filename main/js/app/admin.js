/* ==========================================
   manage.js - 管理弹窗、关于弹窗、全局监听
   ========================================== */

// ========== 管理弹窗桥接 ==========
function openWidgetManager(type) {
    const area = WidgetFramework.areas.get('main-area');
    if (area) {
        const widget = area.widgets.find(w => w.constructor.type === type);
        if (widget && typeof widget.openManager === 'function') {
            closeSettings();
            widget.openManager();
            return;
        }
    }
    alert('未找到该小组件，请先在桌面添加。');
}

function closeManageModal() {
    document.getElementById('manage-modal').classList.remove('active');
    document.body.style.overflow = '';
    const widget = window.currentManageWidget;
    if (widget) {
        widget.render();
        window.currentManageWidget = null;
    }
}

function manageAddItem() {
    const widget = window.currentManageWidget;
    if (!widget) return;
    if (widget instanceof TodoWidget) {
        const todos = JSON.parse(localStorage.getItem('todos') || '[]');
        todos.push({ text: '新待办', completed: false });
        localStorage.setItem('todos', JSON.stringify(todos));
    } else if (widget instanceof BookmarksWidget) {
        const bookmarks = JSON.parse(localStorage.getItem('custom-bookmarks') || '[]');
        bookmarks.push({ name: '新书签', url: 'https://', favicon: '' });
        localStorage.setItem('custom-bookmarks', JSON.stringify(bookmarks));
    } else if (widget instanceof AiToolsWidget) {
        const tools = JSON.parse(localStorage.getItem('custom-ai-tools') || '[]');
        tools.push({ name: '新工具', url: 'https://', favicon: '' });
        localStorage.setItem('custom-ai-tools', JSON.stringify(tools));
    } else if (widget instanceof ShortcutsWidget) {
        const shortcuts = JSON.parse(localStorage.getItem('custom-shortcuts') || '[]');
        shortcuts.push({ name: '新快捷', url: 'https://', icon: 'fa-external-link', color: '#999' });
        localStorage.setItem('custom-shortcuts', JSON.stringify(shortcuts));
    }
    widget.openManager();
}

// ========== 关于弹窗 ==========
function openAboutModal() {
    closeSettings();
    document.getElementById('about-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAboutModal() {
    document.getElementById('about-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// ========== 全局监听 ==========
document.addEventListener('click', function(e) {
    if (e.target.id === 'about-modal') closeAboutModal();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAboutModal();
        closeManageModal();
        closeSettings();
        document.getElementById('widget-gallery-modal')?.classList.remove('active');
    }
});
