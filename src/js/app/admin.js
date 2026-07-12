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
    window.manageModal?.close();
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
    // 从 APP_VERSION 动态填充关于内容
    const container = document.getElementById('about-content');
    if (container && typeof APP_VERSION !== 'undefined') {
        container.innerHTML = APP_VERSION.getAboutHTML();
    }
    window.aboutModal?.open();
}

function closeAboutModal() {
    window.aboutModal?.close();
}

// ========== 全局监听 ==========
// (弹窗由 UIModal 框架统一管理 Escape 键与遮罩点击)
