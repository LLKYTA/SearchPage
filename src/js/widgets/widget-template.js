/* ==========================================
   widget-template.js - 小组件开发模板
   复制此文件并替换占位内容即可创建新小组件
   ========================================== */

class MyWidget extends Widget {
    /* ---- 必填：静态元信息 ---- */
    static type = 'my-widget';              // 全局唯一标识
    static displayName = '我的小组件';       // 显示名称
    static defaultSize = 'sm';             // 'sm' | 'md' | 'lg'
    static icon = 'fa-star';               // FontAwesome 4 图标

    /* ---- 可选：区域数量限制 ---- */
    // static maxPerArea = 1;

    /* ---- 可选：构造函数 ---- */
    constructor(container, index) {
        super(container, index);
        this.data = null;
    }

    /* ---- 必填：渲染内容 ---- */
    render() {
        const content = this.element.querySelector('.widget-content');
        const size = this.currentSize;

        if (size === 'sm') {
            content.innerHTML = `
                <div class="my-widget-compact">
                    <div class="my-widget-icon">⭐</div>
                    <div class="my-widget-value">${this.data || '--'}</div>
                </div>
            `;
        } else if (size === 'md') {
            content.innerHTML = `
                <div class="my-widget-medium">
                    <div class="my-widget-header-inline">
                        <span class="my-widget-label">我的小组件</span>
                        <span class="my-widget-value-lg">${this.data || '--'}</span>
                    </div>
                    <div class="my-widget-desc">扩展内容区域</div>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="my-widget-large">
                    <div class="my-widget-value-xl">${this.data || '--'}</div>
                    <div class="my-widget-details">详细的扩展内容...</div>
                </div>
            `;
        }
    }

    /* ---- 可选：尺寸响应的额外处理 ---- */
    onResize(newSize) {
        // 尺寸已自动切换，this.currentSize 已更新
        // 此方法在 render() 之后调用
        // 如需在尺寸变化时获取新数据，在此触发
    }

    /* ---- 可选：上下文菜单自定义 ---- */
    getContextMenuItems() {
        const items = super.getContextMenuItems();
        // 在「管理」之前插入刷新按钮
        items.splice(1, 0, {
            id: 'refresh',
            label: '刷新',
            icon: '🔄',
            action: () => this.refresh()
        });
        return items;
    }

    /* ---- 可选：管理弹窗 ---- */
    openManager() {
        window.currentManageWidget = this;
        document.getElementById('manage-modal-title').textContent = '管理我的小组件';
        const container = document.getElementById('manage-list-container');
        container.innerHTML = '<p style="padding:16px;color:var(--text-secondary);">管理内容区域</p>';
        window.manageModal?.open();
    }

    /* ---- 可选：外部数据更新 ---- */
    onUpdate() {
        this.refresh();
    }

    /* ---- 可选：数据获取 ---- */
    async refresh() {
        try {
            // const response = await fetch('...');
            // this.data = await response.json();
            this.render();
        } catch (e) {
            console.warn('刷新失败:', e);
        }
    }

    /* ---- 可选：清理 ---- */
    destroy() {
        // 清理定时器等
        super.destroy();
    }
}
