/* ==========================================
   iOS 风格小组件框架 - WidgetFramework
   支持：注册、多区域、拖拽排序(SortableJS)、尺寸切换、持久化、尺寸回调
   长按延迟：触屏设备按住 1 秒后进入拖拽状态
   ========================================== */
const WidgetFramework = {
  registry: new Map(),
  areas: new Map(),
  storageKey: 'widgets-layout',

  register(type, widgetClass) {
    this.registry.set(type, widgetClass);
  },

  init() {
    document.querySelectorAll('[data-widget-area]').forEach(el => {
      const areaId = el.dataset.widgetArea;
      const area = new WidgetArea(el, areaId);
      this.areas.set(areaId, area);
      area.init();
    });
  },

  getLayout() {
    try { return JSON.parse(localStorage.getItem(this.storageKey)) || {}; }
    catch { return {}; }
  },

  saveLayout(layout) {
    localStorage.setItem(this.storageKey, JSON.stringify(layout));
  },

  openGallery(areaId) {
    const modal = document.getElementById('widget-gallery-modal');
    const listContainer = modal.querySelector('.gallery-list');
    listContainer.innerHTML = '';

    const sortedEntries = Array.from(this.registry.entries()).sort((a, b) => {
      return a[1].displayName.localeCompare(b[1].displayName);
    });

    sortedEntries.forEach(([type, WidgetClass]) => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.innerHTML = `
        <i class="fa ${WidgetClass.icon || 'fa-puzzle-piece'} gallery-card-icon"></i>
        <div class="gallery-card-name">${WidgetClass.displayName}</div>
      `;
      card.addEventListener('click', () => {
        const area = WidgetFramework.areas.get(areaId);
        if (area) {
          const added = area.addWidget(type);
          if (added) {
            // 添加成功，弹窗保持打开
          }
        }
      });
      listContainer.appendChild(card);
    });

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

// ========== 基类 Widget ==========
class Widget {
  constructor(container, index) {
    this.container = container;
    this.index = index;
    this.element = null;
    this.currentSize = this.constructor.defaultSize;
  }

  createDOM() {
    const div = document.createElement('div');
    div.className = `widget glass widget-${this.currentSize}`;
    div.dataset.widgetType = this.constructor.type;
    div.innerHTML = `
      <div class="widget-header">
        <i class="fa ${this.constructor.icon} widget-icon"></i>
        <span class="widget-title">${this.constructor.displayName}</span>
        <div class="widget-header-actions">
          <button class="widget-size-btn" title="切换尺寸"><i class="fa fa-arrows-alt"></i></button>
          <button class="widget-delete-btn" title="移除"><i class="fa fa-times"></i></button>
        </div>
      </div>
      <div class="widget-content"></div>
    `;
    this.element = div;
    this._bindHeaderActions();
    return div;
  }

  _bindHeaderActions() {
    const delBtn = this.element.querySelector('.widget-delete-btn');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const areaId = this.container.closest('[data-widget-area]').dataset.widgetArea;
      WidgetFramework.areas.get(areaId)?.removeWidget(this);
    });

    const sizeBtn = this.element.querySelector('.widget-size-btn');
    sizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleSize();
    });
  }

  cycleSize() {
    const sizes = ['sm', 'md', 'lg'];
    const current = sizes.find(s => this.element.classList.contains(`widget-${s}`)) || this.currentSize;
    const nextIdx = (sizes.indexOf(current) + 1) % sizes.length;
    const newSize = sizes[nextIdx];

    this.element.classList.remove(`widget-${current}`);
    this.element.classList.add(`widget-${newSize}`);
    this.currentSize = newSize;

    const areaId = this.container.closest('[data-widget-area]').dataset.widgetArea;
    const area = WidgetFramework.areas.get(areaId);
    if (area && area.layout[this.index]) {
      area.layout[this.index].size = newSize;
      area.saveLayout();
    }

    this.onResize(newSize);
  }

  onResize(newSize) {
    this.render();
  }

  render() { throw new Error('render() must be implemented'); }
  onUpdate() {}
  destroy() { this.element?.remove(); }
  openManager() {}
}

// ========== WidgetArea ==========
class WidgetArea {
  constructor(container, id) {
    this.container = container;
    this.id = id;
    this.widgets = [];
    this.layout = [];
    this.sortableInstance = null; // 保存 Sortable 实例引用
  }

  init() {
    this.loadLayout();
    this.render();
    this._enableDragDrop();
  }

  loadLayout() {
    const all = WidgetFramework.getLayout();
    const areaLayout = all[this.id] || this._getDefaultLayout();
    this.layout = areaLayout;
  }

  _getDefaultLayout() {
    const str = this.container.dataset.defaultWidgets;
    return str ? JSON.parse(str) : [];
  }

  saveLayout() {
    const all = WidgetFramework.getLayout();
    all[this.id] = this.layout;
    WidgetFramework.saveLayout(all);
  }

  render() {
    this.container.innerHTML = '';
    this.widgets = [];
    this.layout.forEach((item, idx) => {
      const WidgetClass = WidgetFramework.registry.get(item.type);
      if (!WidgetClass) return;
      const widget = new WidgetClass(this.container, idx);
      const dom = widget.createDOM();
      const size = item.size || WidgetClass.defaultSize;
      dom.classList.add(`widget-${size}`);
      dom.dataset.index = idx;
      this.container.appendChild(dom);
      widget.render();
      this.widgets.push(widget);
    });
  }

  addWidget(type, size) {
    const WidgetClass = WidgetFramework.registry.get(type);
    if (!WidgetClass) return false;
    const count = this.layout.filter(l => l.type === type).length;
    if (count >= (WidgetClass.maxPerArea || Infinity)) {
      alert(`该区域最多添加 ${WidgetClass.maxPerArea} 个“${WidgetClass.displayName}”`);
      return false;
    }
    const newItem = {
      type,
      size: size || WidgetClass.defaultSize || 'sm',
      config: {}
    };
    this.layout.push(newItem);
    this.saveLayout();
    this.render();
    return true;
  }

  removeWidget(widgetInstance) {
    const idx = this.widgets.indexOf(widgetInstance);
    if (idx > -1) {
      this.layout.splice(idx, 1);
      this.widgets.splice(idx, 1);
      widgetInstance.destroy();
      this.saveLayout();
      this.render();
    }
  }

  moveWidget(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;

    const children = this.container.children;
    const fromNode = children[fromIdx];
    const toNode = children[toIdx];
    if (fromNode && toNode) {
      if (fromIdx < toIdx) {
        this.container.insertBefore(fromNode, toNode.nextSibling);
      } else {
        this.container.insertBefore(fromNode, toNode);
      }
    }

    const movedWidget = this.widgets.splice(fromIdx, 1)[0];
    this.widgets.splice(toIdx, 0, movedWidget);
    this.widgets.forEach((w, idx) => w.index = idx);

    const movedLayout = this.layout.splice(fromIdx, 1)[0];
    this.layout.splice(toIdx, 0, movedLayout);

    this.saveLayout();
  }

  _enableDragDrop() {
    if (typeof Sortable === 'undefined') {
      console.warn('SortableJS 未加载，拖拽排序不可用');
      return;
    }

    // 如果已有实例，先销毁
    if (this.sortableInstance) {
      this.sortableInstance.destroy();
      this.sortableInstance = null;
    }

    this.sortableInstance = new Sortable(this.container, {
      animation: 200,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      handle: '.widget-header',
      draggable: '.widget',

      // ===== 长按延迟配置（优化移动端体验） =====
      delay: 500,                    // 按住 1000ms 后才触发拖拽
      delayOnTouchOnly: true,         // 仅在触屏设备生效（鼠标拖拽无延迟）
      touchStartThreshold: 3,         // 手指移动 3px 内算长按，防止轻微滑动误触

      // 过滤按钮，不触发拖拽
      filter: '.widget-size-btn, .widget-delete-btn, .widget-header-add-btn',
      preventOnFilter: false,

      ghostClass: 'widget-ghost',
      chosenClass: 'widget-chosen',
      dragClass: 'widget-drag',

      // ===== 长按视觉反馈 =====
      onChoose: (evt) => {
        // 开始长按/选择时，添加等待状态类
        const el = evt.item;
        el.classList.add('widget-waiting');
        // 可选：触觉反馈（移动端振动）
        if (navigator.vibrate) {
          navigator.vibrate(15); // 轻微振动提示
        }
      },

      onUnchoose: (evt) => {
        // 取消选择时移除等待状态
        const el = evt.item;
        el.classList.remove('widget-waiting');
      },

      onStart: (evt) => {
        // 真正开始拖拽时，移除等待状态并添加拖拽类
        const el = evt.item;
        el.classList.remove('widget-waiting');
        el.classList.add('widget-dragging');
      },

      onEnd: (evt) => {
        // 拖拽结束清理状态
        const el = evt.item;
        el.classList.remove('widget-dragging', 'widget-waiting');

        if (evt.oldIndex !== evt.newIndex) {
          this.moveWidget(evt.oldIndex, evt.newIndex);
        }
      }
    });
  }
}