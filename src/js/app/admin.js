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


// ========== 搜索引擎管理（拖拽引擎到启用/禁用区） ==========

/** 引擎拖拽实例 */
let engineSortableEnabled = null;
let engineSortableDisabled = null;

function openEngineManager() {
    const modal = document.getElementById('engine-manager-modal');
    if (!modal) return;

    const enabledList = document.getElementById('engine-enabled-list');
    const disabledList = document.getElementById('engine-disabled-list');
    if (!enabledList || !disabledList) return;

    // 关闭设置（如果是从设置打开）
    closeSettings();

    // 销毁旧 Sortable 实例
    if (engineSortableEnabled) engineSortableEnabled.destroy();
    if (engineSortableDisabled) engineSortableDisabled.destroy();

    // 渲染引擎卡片
    const enabled = getEnabledEngines();
    const allIds = SEARCH_ENGINE_POOL.map(e => e.id);
    const disabled = allIds.filter(id => !enabled.includes(id));

    enabledList.innerHTML = enabled.map(id => renderEngineCard(id)).join('');
    disabledList.innerHTML = disabled.map(id => renderEngineCard(id)).join('');

    // 创建 SortableJS 连接拖拽
    engineSortableEnabled = new Sortable(enabledList, {
        group: { name: 'engines', pull: true, put: true },
        animation: 250,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        handle: '.engine-drag-handle',
        draggable: '.engine-manager-card',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onSort: () => syncEngineOrder(),
        onAdd: () => syncEngineOrder(),
        onRemove: () => syncEngineOrder()
    });

    engineSortableDisabled = new Sortable(disabledList, {
        group: { name: 'engines', pull: true, put: true },
        animation: 250,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        handle: '.engine-drag-handle',
        draggable: '.engine-manager-card',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onAdd: () => syncEngineOrder(),
        onRemove: () => syncEngineOrder()
    });

    // 弹出
    window.engineManagerModal = window.engineManagerModal || new UIModal(modal, {
        closeOnOverlay: true,
        closeOnEscape: true
    });
    window.engineManagerModal.open();
}

/** 渲染单个引擎卡片 */
function renderEngineCard(engineId) {
    const cfg = getEngineConfig(engineId);
    return `<div class="engine-manager-card" data-engine="${engineId}">
        <span class="engine-drag-handle">&#8801;</span>
        <span class="engine-manager-icon">
            <i class="fa ${cfg.icon || 'fa-search'}"></i>
        </span>
        <span class="engine-manager-name">${cfg.name}</span>
    </div>`;
}

/** 同步拖拽后的引擎顺序 */
function syncEngineOrder() {
    const enabledList = document.getElementById('engine-enabled-list');
    if (!enabledList) return;
    const cards = enabledList.querySelectorAll('.engine-manager-card');
    const engines = Array.from(cards).map(c => c.dataset.engine).filter(Boolean);
    saveEnabledEngines(engines);
    // 同步下拉菜单
    renderEngineDropdown();
    // 如果当前引擎被禁用，切换到第一个可用引擎
    if (!engines.includes(CONFIG.currentEngine) && engines.length > 0) {
        setSearchEngine(engines[0]);
    }
}
