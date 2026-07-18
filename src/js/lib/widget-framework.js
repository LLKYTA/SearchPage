/* ==========================================
   iOS 18 风格小组件框架 - WidgetFramework v3
   Spring 动画 · 位置感知网格 · 智能紧凑排列
   ========================================== */

// ===== Spring 动画工具 =====
const Spring = {
  // 常用曲线
  curves: {
    pop: 'cubic-bezier(0.32, 0.72, 0, 1)',
    slide: 'cubic-bezier(0.16, 1, 0.3, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  /**
   * 使用 Web Animations API 执行 Spring 动画
   * @param {Element} el - 目标元素
   * @param {Object[]} keyframes - 关键帧数组
   * @param {Object} opts - 选项
   * @returns {Animation} 动画对象
   */
  animate(el, keyframes, opts = {}) {
    const { duration = 400, easing = this.curves.slide, fill = 'both', delay = 0 } = opts;
    return el.animate(keyframes, { duration, easing, fill, delay });
  },

  /** 入场：缩放 + 上移淡入 */
  animateIn(el, delay = 0) {
    return this.animate(el, [
      { opacity: 0, transform: 'scale(0.92) translateY(16px)' },
      { opacity: 1, transform: 'scale(1) translateY(0)' }
    ], { duration: 500, easing: this.curves.bounce, delay });
  },

  /** 出场：缩小淡出 */
  animateOut(el) {
    return this.animate(el, [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.85)' }
    ], { duration: 350, easing: this.curves.pop });
  },

  /** 尺寸变化脉冲 */
  animateResize(el) {
    return this.animate(el, [
      { transform: 'scale(1)' },
      { transform: 'scale(1.03)' },
      { transform: 'scale(1)' }
    ], { duration: 450, easing: this.curves.bounce });
  },

};

// ========== WidgetContextMenu — 浮动上下文菜单 ==========
const WidgetContextMenu = {
  _activeMenu: null,
  _activeWidget: null,
  _dismissTimer: null,

  show(event, widget, items) {
    if (this._dismissTimer) {
      clearTimeout(this._dismissTimer);
      this._dismissTimer = null;
    }
    this.dismiss();

    const menu = document.createElement('div');
    menu.className = 'widget-context-menu';
    menu.style.position = 'fixed';
    menu.style.zIndex = '10000';
    menu.style.opacity = '0';
    menu.style.transform = 'scale(0.92)';
    menu.style.transition = 'opacity 0.2s, transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';

    items.forEach(item => {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        menu.appendChild(sep);
        return;
      }
      const btn = document.createElement('button');
      btn.className = 'context-menu-item' + (item.destructive ? ' destructive' : '');
      btn.innerHTML = item.icon ? `<span class="context-menu-icon">${item.icon}</span>` : '';
      btn.innerHTML += `<span class="context-menu-label">${item.label}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss();
        item.action();
      });
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    // 定位：防止溢出视口
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = event.clientX;
      let top = event.clientY;

      if (left + rect.width + 16 > vw) left = vw - rect.width - 16;
      if (top + rect.height + 16 > vh) top = vh - rect.height - 16;
      left = Math.max(12, left);
      top = Math.max(12, top);

      menu.style.left = left + 'px';
      menu.style.top = top + 'px';
      menu.style.opacity = '1';
      menu.style.transform = 'scale(1)';
    });

    this._activeMenu = menu;
    this._activeWidget = widget;

    // 点击外部关闭
    setTimeout(() => {
      document.addEventListener('pointerdown', this._dismissHandler = () => this.dismiss(), { once: true });
    }, 0);

    // Escape 关闭
    document.addEventListener('keydown', this._escHandler = (e) => {
      if (e.key === 'Escape') this.dismiss();
    }, { once: true });
  },

  dismiss() {
    if (this._dismissTimer) {
      clearTimeout(this._dismissTimer);
      this._dismissTimer = null;
    }
    if (this._activeMenu) {
      const menu = this._activeMenu;
      this._activeMenu = null;
      menu.style.opacity = '0';
      menu.style.transform = 'scale(0.92)';
      this._dismissTimer = setTimeout(() => {
        if (menu.parentNode) menu.remove();
        this._dismissTimer = null;
      }, 200);
      this._activeWidget = null;
    }
    if (this._dismissHandler) {
      document.removeEventListener('pointerdown', this._dismissHandler);
      this._dismissHandler = null;
    }
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  },

  isVisible() {
    return this._activeMenu !== null && this._activeMenu.parentNode !== null;
  }
};

// ========== GridTracker — 网格占用追踪与空位查找 ==========
class GridTracker {
  constructor(maxCols = 3) {
    this.maxCols = maxCols;
    this.cells = new Set(); // "row,col" 字符串
  }

  /** 在网格中占位 */
  occupy(col, row, size) {
    const span = this._span(size);
    for (let c = col; c < Math.min(col + span, this.maxCols + 1); c++) {
      this.cells.add(`${row},${c}`);
    }
  }

  /** 清除占位 */
  clear(col, row, size) {
    const span = this._span(size);
    for (let c = col; c < Math.min(col + span, this.maxCols + 1); c++) {
      this.cells.delete(`${row},${c}`);
    }
  }

  /** 指定位置是否可用 */
  isAvailable(col, row, size) {
    const span = this._span(size);
    for (let c = col; c < Math.min(col + span, this.maxCols + 1); c++) {
      if (this.cells.has(`${row},${c}`)) return false;
    }
    return true;
  }

  /** 寻找下一个空位（从左到右，从上到下） */
  findNextAvailable(size) {
    const span = this._span(size);
    for (let row = 1; row < 100; row++) {
      for (let col = 1; col <= this.maxCols - span + 1; col++) {
        if (this.isAvailable(col, row, size)) {
          return { col, row };
        }
      }
    }
    return { col: 1, row: 1 }; // 兜底
  }

  _span(size) {
    const map = { sm: 1, md: 2, lg: 3 };
    return Math.min(map[size] || 1, this.maxCols);
  }
}

// ========== WidgetFramework 单例 ==========
const WidgetFramework = {
  registry: new Map(),
  areas: new Map(),
  storageKey: 'widgets-layout',
  _layoutVersion: 3,         // 当前布局版本 v3 = 分组

  // ===== 分组定义 =====
  WIDGET_GROUPS: [
    { id: 'tools',     title: '常用工具', icon: 'fa-wrench',      types: ['clock', 'weather', 'time-progress'] },
    { id: 'tasks',     title: '任务',     icon: 'fa-clipboard',    types: ['todo', 'bookmarks'] },
    { id: 'shortcuts', title: '快捷方式', icon: 'fa-link',        types: ['shortcuts'] },
    { id: 'news',      title: '资讯',     icon: 'fa-newspaper-o',  types: ['hotboard', 'daily-word'] },
  ],

  getGroupForType(type) {
    const group = this.WIDGET_GROUPS.find(g => g.types.includes(type));
    return group ? group.id : 'other';
  },

  getGroupDef(id) {
    return this.WIDGET_GROUPS.find(g => g.id === id) || { id: 'other', title: '其他', icon: 'fa-puzzle-piece' };
  },

  // ===== 各小组件预览内容 =====
  _previews: {
    clock: '<div class="preview-widget"><div class="time-display" style="font-size:22px;text-align:center;margin:4px 0 2px;">12:00</div><div class="date-display" style="font-size:10px;text-align:center;">2026年7月5日 周日</div></div>',
    weather: '<div class="preview-widget"><div style="display:flex;align-items:center;gap:10px;justify-content:center;padding:4px 0;"><span style="font-size:26px;">☀️</span><div><div style="font-size:22px;font-weight:700;">28°</div><div style="font-size:11px;color:var(--text-secondary);">晴 · 北京</div></div></div></div>',
    shortcuts: '<div class="preview-widget"><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:2px;">' +
      [ '#007AFF', '#34C759', '#FF9500', '#AF52DE' ].map(c =>
        `<div style="width:32px;height:32px;border-radius:8px;background:${c};margin:0 auto;display:flex;align-items:center;justify-content:center;"><i class="fa fa-link" style="color:white;font-size:12px;"></i></div>`
      ).join('') + '</div><div style="display:grid;grid-template-columns:repeat(2,1fr);font-size:9px;color:var(--text-secondary);text-align:center;margin-top:2px;"><span>Chat</span><span>Mail</span><span>Map</span><span>Cal</span></div></div>',
    todo: '<div class="preview-widget"><div style="display:flex;flex-direction:column;gap:4px;">' +
      [ '完成报告', '回复邮件', '运动30分' ].map(t =>
        `<div style="display:flex;align-items:center;gap:6px;"><div style="width:14px;height:14px;border-radius:4px;border:2px solid var(--text-tertiary);flex-shrink:0;"></div><span style="font-size:11px;color:var(--text-primary);">${t}</span></div>`
      ).join('') + '</div></div>',
    bookmarks: '<div class="preview-widget"><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;">' +
      [ ['Github','#333'], ['知乎','#056DE8'], ['B站','#FB7299'], ['掘金','#1E80FF'] ].map(([n,c]) =>
        `<div style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:6px;"><div style="width:20px;height:20px;border-radius:5px;background:${c};display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa fa-globe" style="color:white;font-size:10px;"></i></div><span style="font-size:10px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n}</span></div>`
      ).join('') + '</div></div>',
    hotboard: '<div class="preview-widget" style="padding:0 4px;">' +
      [ ['微博热搜','128万'], ['热榜第一','95万'], ['热门话题','76万'], ['热搜趋势','52万'] ].map(([t,h],i) =>
        `<div style="display:flex;align-items:center;gap:6px;padding:5px 2px;"><span style="width:18px;height:18px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;${i<3?'background:linear-gradient(135deg,#FF3B30,#FF9500);color:white;':'background:var(--bg-tertiary);color:var(--text-secondary);'}flex-shrink:0;">${i+1}</span><span style="font-size:10px;color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t}</span><span style="font-size:9px;color:var(--text-tertiary);">${h}</span></div>`
      ).join('') + '</div>',
    'time-progress': '<div class="preview-widget"><div style="display:flex;flex-direction:column;gap:6px;">' +
      [ ['今日','60%','var(--ios-blue)'], ['本周','45%','var(--ios-purple)'], ['今年','52%','var(--ios-green)'] ].map(([l,p,c]) =>
        `<div><div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-secondary);margin-bottom:2px;"><span>${l}</span><span>${p}</span></div><div style="height:6px;border-radius:3px;background:var(--bg-tertiary);overflow:hidden;"><div style="height:100%;width:${p};border-radius:3px;background:${c};"></div></div></div>`
      ).join('') + '</div></div>',
    'daily-word': '<div class="preview-widget"><div class="dailyword-sm"><div class="dailyword-word" style="font-size:18px;font-weight:700;text-align:center;">Serendipity</div><div class="dailyword-def" style="font-size:11px;text-align:center;color:var(--text-secondary);margin-top:2px;">意外发现美好事物的能力</div></div></div>'
  },

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

  // ===== 3D 倾斜效果（增强版） =====
  _initTilt(card) {
    let isTilting = false;
    let rafId = null;

    const onMove = (e) => {
      if (!isTilting) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        card.style.setProperty('--tilt-x', `${rotateX}deg`);
        card.style.setProperty('--tilt-y', `${rotateY}deg`);
      });
    };

    const onEnter = () => { isTilting = true; };
    const onLeave = () => {
      isTilting = false;
      if (rafId) cancelAnimationFrame(rafId);
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      card.style.transition = '--tilt-x 0.4s cubic-bezier(0.16, 1, 0.3, 1), --tilt-y 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => { card.style.transition = ''; }, 500);
    };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
  },

  // ===== 打开小组件库（Spring 动画版） =====
  openGallery(areaId) {
    const modal = document.getElementById('widget-gallery-modal');
    const listContainer = modal.querySelector('.gallery-list');
    listContainer.innerHTML = '';

    const sortedEntries = Array.from(this.registry.entries()).sort((a, b) => {
      return a[1].displayName.localeCompare(b[1].displayName);
    });

    sortedEntries.forEach(([type, WidgetClass]) => {
      const card = document.createElement('div');
      card.className = 'gallery-card gallery-card-preview';
      const previewHtml = this._previews[type] || '';

      card.innerHTML = `
        <div class="gallery-card-preview-wrap">
          <div class="gallery-card-preview-inner">
            ${previewHtml}
          </div>
        </div>
        <div class="gallery-card-footer">
          <div class="gallery-card-info">
            <i class="fa ${WidgetClass.icon || 'fa-puzzle-piece'} gallery-card-icon"></i>
            <span class="gallery-card-name">${WidgetClass.displayName}</span>
          </div>
          <button class="gallery-card-add-btn" title="添加此小组件">
            <i class="fa fa-plus"></i>
          </button>
        </div>
      `;

      this._initTilt(card);

      card.querySelector('.gallery-card-add-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const area = WidgetFramework.areas.get(areaId);
        if (area) {
          const added = area.addWidget(type);
          if (added) {
            card.classList.add('gallery-card-added');
            setTimeout(() => card.classList.remove('gallery-card-added'), 600);
          }
        }
      });

      card.addEventListener('click', () => {
        const area = WidgetFramework.areas.get(areaId);
        if (area) {
          const added = area.addWidget(type);
          if (added) {
            card.classList.add('gallery-card-added');
            setTimeout(() => card.classList.remove('gallery-card-added'), 600);
          }
        }
      });

      listContainer.appendChild(card);
    });

    if (window.galleryModal) {
        window.galleryModal.open();
    } else {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    requestAnimationFrame(() => {
      listContainer.querySelectorAll('.gallery-card-preview').forEach((c, i) => {
        c.style.setProperty('--card-delay', `${i * 0.05}s`);
        c.classList.add('gallery-card-visible');
      });
    });

    setTimeout(() => {
      listContainer.querySelectorAll('.gallery-card-preview').forEach(c => {
        c.style.removeProperty('--card-delay');
      });
    }, sortedEntries.length * 50 + 600);
  }
};

// ========== 基类 Widget（iOS 18 Spring 版） ==========
class Widget {
  constructor(container, index) {
    this.container = container;
    this.index = index;
    this.element = null;
    this.currentSize = this.constructor.defaultSize;
    this._animations = [];
  }

  createDOM() {
    const div = document.createElement('div');
    div.className = `widget widget-${this.currentSize}`;
    div.dataset.widgetType = this.constructor.type;
    div.innerHTML = `<div class="widget-content"></div>`;
    this.element = div;
    // 初始化移动端长按手势
    this._initLongPress();
    return div;
  }

  cycleSize() {
    const sizes = ['sm', 'md', 'lg'];
    const current = sizes.find(s => this.element.classList.contains(`widget-${s}`)) || this.currentSize;
    const nextIdx = (sizes.indexOf(current) + 1) % sizes.length;
    const newSize = sizes[nextIdx];

    const areaId = this.container.closest('[data-widget-area]').dataset.widgetArea;
    const area = WidgetFramework.areas.get(areaId);
    if (!area) return;

    // 通过 dataset.groupId 和全局索引找到布局中对应的项
    const groupId = this.element?.dataset.groupId;
    if (area.layout && area.layout.groups && groupId) {
      let globalIdx = 0;
      for (const g of area.layout.groups) {
        const wList = g.widgets || [];
        if (this.index >= globalIdx && this.index < globalIdx + wList.length) {
          if (g.id === groupId) {
            const localIdx = this.index - globalIdx;
            if (wList[localIdx]) {
              wList[localIdx].size = newSize;
            }
          }
          break;
        }
        globalIdx += wList.length;
      }
    }

    this.currentSize = newSize;

    // 全区域紧凑排列：其他 widget 自动补位，消除空隙
    area.compactAll();
  }

  // ===== Spring 动画生命周期 =====
  animateIn() {
    return Spring.animateIn(this.element);
  }

  animateOut() {
    return Spring.animateOut(this.element);
  }

  onResize(newSize) {
    this.render();
  }

  render() { throw new Error('render() must be implemented'); }
  onUpdate() {}

  /**
   * 返回上下文菜单项数组。
   * 子类可覆盖此方法追加自定义菜单项。
   * @returns {Array<{id:string, label:string, icon?:string, destructive?:boolean, action:Function}>}
   */
  getContextMenuItems() {
    const items = [];
    // 尺寸切换
    items.push({ id: 'size', label: '切换尺寸', icon: '🔃', action: () => this.cycleSize() });
    // 如果子类覆盖了 openManager，展示管理入口
    if (this.openManager !== Widget.prototype.openManager) {
        items.push({ id: 'manage', label: '管理', icon: '✏️', action: () => this.openManager() });
    }

    // 跨组移动子菜单
    const currentGroupId = this.element?.dataset.groupId;
    const availableGroups = WidgetFramework.WIDGET_GROUPS.filter(g => g.id !== currentGroupId);
    if (availableGroups.length > 0) {
        items.push({ type: 'separator' });
        items.push({ id: 'move-header', label: '移动到...', icon: '📦', action: () => {} });
        availableGroups.forEach(g => {
            items.push({
                id: `move-to-${g.id}`,
                label: `  ${g.title}`,
                icon: '',
                action: () => {
                    const areaId = this.container.closest('[data-widget-area]').dataset.widgetArea;
                    const area = WidgetFramework.areas.get(areaId);
                    if (area) area.moveWidgetToGroup(this, g.id);
                }
            });
        });
    }

    items.push({ type: 'separator' });
    items.push({ id: 'delete', label: '移除小组件', icon: '🗑️', destructive: true, action: () => {
        const areaId = this.container.closest('[data-widget-area]').dataset.widgetArea;
        WidgetFramework.areas.get(areaId)?.removeWidget(this);
    }});
    return items;
  }

  /**
   * 响应上下文菜单事件（contextmenu / 长按）
   * @param {PointerEvent|MouseEvent} event
   */
  onContextMenu(event) {
    event.preventDefault();
    WidgetContextMenu.show(event, this, this.getContextMenuItems());
  }

  /**
   * 初始化移动端长按手势
   * 通过位移阈值（10px）区分：按住不动→菜单，按住移动→拖拽
   */
  _initLongPress() {
    const el = this.element;
    if (!el) return;
    let longPressTimer = null;
    let startX = -1, startY = -1;
    const THRESHOLD = 10;    // 位移阈值，超过则取消长按
    const DELAY = 500;       // 长按触发延迟（ms）

    const onTouchStart = (e) => {
      if (WidgetContextMenu.isVisible()) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        // 震动反馈
        if (navigator.vibrate) navigator.vibrate(10);
        // 构造一个类似 MouseEvent 的事件对象传给 onContextMenu
        const fakeEvent = {
          clientX: startX,
          clientY: startY,
          preventDefault: () => {},
          target: el,
        };
        // 阻止浏览器原生 contextmenu
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
        }, { once: true });
        this.onContextMenu(fakeEvent);
      }, DELAY);
    };

    const onTouchMove = (e) => {
      if (longPressTimer === null) return;
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - startX);
      const dy = Math.abs(t.clientY - startY);
      if (dx > THRESHOLD || dy > THRESHOLD) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const onTouchEnd = () => {
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // 保存引用以备 destroy 时清理
    this._longPressCleanup = () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }

  destroy() {
    if (this._longPressCleanup) {
      this._longPressCleanup();
      this._longPressCleanup = null;
    }
    if (WidgetContextMenu._activeWidget === this) {
        WidgetContextMenu.dismiss();
    }
    this.element?.remove();
  }
  openManager() {}
}

// ========== WidgetArea（自由网格布局版） ==========
class WidgetArea {
  constructor(container, id) {
    this.container = container;
    this.id = id;
    this.widgets = [];
    this.layout = { groups: [] };
    this._sortableInstances = [];
    this._pendingRemove = false;
    this._removingIndex = -1;
    this._lastCols = 3;
    this._resizeHandler = null;
    this._groupElements = {};
  }

  init() {
    this.loadLayout();
    this.render();
    this._initResizeObserver();
  }

  // ===== 布局持久化 =====

  loadLayout() {
    const all = WidgetFramework.getLayout();
    const version = all._version || 1;
    let areaLayout = all[this.id];

    // 处理空布局
    if (!areaLayout) {
      areaLayout = this._getDefaultLayout();
    }

    if (version < WidgetFramework._layoutVersion) {
      areaLayout = this._migrateLayout(areaLayout, version);
      all[this.id] = areaLayout;
      all._version = WidgetFramework._layoutVersion;
      WidgetFramework.saveLayout(all);
    }

    this.layout = areaLayout;
  }

  /** 迁移旧布局：v2（扁平数组）→ v3（分组格式） */
  _migrateLayout(layout, fromVersion) {
    // v2 → v3: 扁平数组 → 分组格式
    if (fromVersion < 3) {
      let flat;
      if (Array.isArray(layout)) {
        // v0/v1 或 v2: layout 是数组
        if (fromVersion < 2) {
          // v0/v1: 没有 position，需要计算
          const cols = this._getColumnCount();
          const grid = new GridTracker(cols);
          layout.forEach(item => {
            const WidgetClass = WidgetFramework.registry.get(item.type);
            const defaultSize = WidgetClass ? WidgetClass.defaultSize : 'sm';
            const size = item.size || defaultSize;
            const pos = grid.findNextAvailable(size);
            item.size = size;
            item.config = item.config || {};
            item.position = { col: pos.col, row: pos.row };
            grid.occupy(pos.col, pos.row, size);
          });
        }
        flat = layout;
      } else if (layout && layout.groups) {
        // 已经是分组格式但版本低
        return layout;
      } else {
        flat = [];
      }

      // 按类型分组
      const groupMap = {};
      WidgetFramework.WIDGET_GROUPS.forEach(g => { groupMap[g.id] = []; });
      groupMap.other = [];

      flat.forEach(item => {
        const gid = WidgetFramework.getGroupForType(item.type);
        if (!groupMap[gid]) groupMap[gid] = [];
        groupMap[gid].push({
          type: item.type,
          size: item.size || 'sm',
          config: item.config || {}
        });
      });

      // 移除空组
      const groups = [];
      WidgetFramework.WIDGET_GROUPS.forEach(g => {
        if (groupMap[g.id] && groupMap[g.id].length > 0) {
          groups.push({ ...g, widgets: groupMap[g.id] });
        }
      });
      if (groupMap.other && groupMap.other.length > 0) {
        groups.push({ id: 'other', title: '其他', icon: 'fa-puzzle-piece', widgets: groupMap.other, types: [] });
      }

      return { groups };
    }
    return layout;
  }

  _getDefaultLayout() {
    const str = this.container.dataset.defaultWidgets;
    if (!str) return { groups: [] };
    try {
      const parsed = JSON.parse(str);
      // 兼容旧格式（扁平数组）
      if (Array.isArray(parsed)) {
        return this._migrateLayout(parsed, 2);
      }
      return parsed;
    } catch {
      return { groups: [] };
    }
  }

  saveLayout() {
    const all = WidgetFramework.getLayout();
    all[this.id] = this.layout;
    all._version = WidgetFramework._layoutVersion;
    WidgetFramework.saveLayout(all);
  }

  // ===== 渲染 =====

  render() {
    this.container.innerHTML = '';
    this.widgets = [];
    this._groupElements = {};
    this._sortableInstances = [];

    // 确保布局是 v3 格式
    if (!this.layout || !this.layout.groups) {
      this.layout = { groups: [] };
    }

    const cols = this._getColumnCount();
    this._lastCols = cols;

    this.layout.groups.forEach((group, gi) => {
      // 创建分组 section
      const section = document.createElement('section');
      section.className = 'widget-group';
      section.dataset.group = group.id;

      // 分组标题
      const header = document.createElement('div');
      header.className = 'widget-group-header';
      header.innerHTML = `<i class="fa ${group.icon}"></i><span>${group.title}</span>`;
      section.appendChild(header);

      // 分组网格容器
      const grid = document.createElement('div');
      grid.className = 'widget-group-grid';
      grid.dataset.groupGrid = group.id;
      section.appendChild(grid);

      this.container.appendChild(section);
      this._groupElements[group.id] = grid;

      // 计算该组的网格位置
      const positioned = this._layoutGroupForBreakpoint(group.widgets, cols);

      positioned.forEach((item, sortIndex) => {
        const WidgetClass = WidgetFramework.registry.get(item.type);
        if (!WidgetClass) return;
        const widget = new WidgetClass(this.container, this.widgets.length);
        const dom = widget.createDOM();

        const span = this._span(item.size, cols);
        const pos = item.position || { col: 1, row: 1 };
        dom.style.gridColumn = `${pos.col} / span ${span}`;
        dom.style.gridRow = `${pos.row} / span 1`;
        dom.dataset.position = JSON.stringify(pos);
        dom.dataset.groupId = group.id;

        grid.appendChild(dom);

        // 上下文菜单
        dom.addEventListener('contextmenu', (e) => widget.onContextMenu(e));

        widget.render();
        widget.animateIn(sortIndex * 0.06);
        this.widgets.push(widget);
      });
    });

    this._enableDragDrop();
  }

  /** 计算一组内 widgets 的网格位置 */
  _layoutGroupForBreakpoint(widgets, cols) {
    const grid = new GridTracker(cols);
    return widgets.map(item => {
      let size = item.size;
      if (cols === 1 && size === 'lg') {
        size = 'md';
      } else if (cols === 2 && size === 'lg') {
        size = 'md';
      }
      const pos = grid.findNextAvailable(size);
      grid.occupy(pos.col, pos.row, size);
      return { ...item, size, position: pos };
    });
  }

  /** 获取当前视口宽度对应的列数（与 CSS media query 对齐） */
  _getColumnCount() {
    const w = window.innerWidth;
    if (w <= 480) return 1;
    if (w <= 768) return 2;
    return 3;
  }

  /** 获取尺寸对应的列跨度数 */
  _span(size, cols) {
    const map = { sm: 1, md: 2, lg: 3 };
    return Math.min(map[size] || 1, cols);
  }

  // ===== 窗口尺寸变化监听 =====

  _initResizeObserver() {
    let resizeTimer = null;
    this._resizeHandler = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newCols = this._getColumnCount();
        if (newCols !== this._lastCols) {
          this._lastCols = newCols;
          this.render();
        }
        resizeTimer = null;
      }, 150);
    };
    window.addEventListener('resize', this._resizeHandler);
  }

  destroy() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
    if (this._sortableInstances) {
      this._sortableInstances.forEach(s => s.destroy());
      this._sortableInstances = [];
    }
  }

  // ===== Widget 增删改 =====

  addWidget(type, size) {
    const WidgetClass = WidgetFramework.registry.get(type);
    if (!WidgetClass) return false;

    // 获取目标组
    const groupId = WidgetFramework.getGroupForType(type);
    let group = this.layout.groups.find(g => g.id === groupId);
    if (!group) {
      const def = WidgetFramework.getGroupDef(groupId);
      group = { ...def, widgets: [] };
      this.layout.groups.push(group);
    }

    // 检查数量限制
    const count = group.widgets.filter(w => w.type === type).length;
    if (count >= (WidgetClass.maxPerArea || Infinity)) {
      alert(`该区域最多添加 ${WidgetClass.maxPerArea} 个"${WidgetClass.displayName}"`);
      return false;
    }

    group.widgets.push({
      type,
      size: size || WidgetClass.defaultSize || 'sm',
      config: {}
    });

    this.saveLayout();
    this.render();
    return true;
  }

  removeWidget(widgetInstance) {
    if (this._pendingRemove) return;
    const idx = this.widgets.indexOf(widgetInstance);
    if (idx === -1) return;
    const el = widgetInstance.element;
    if (el) {
      this._pendingRemove = true;
      this._removingIndex = idx;
      const anim = widgetInstance.animateOut();
      const doRemove = () => {
        if (this._removingIndex === -1) return; // 已处理
        const i = this._removingIndex;
        this._removingIndex = -1;
        this._doRemove(i);
      };
      anim.finished.then(doRemove).catch(doRemove);
      setTimeout(doRemove, 500);
    } else {
      this._pendingRemove = true;
      this._doRemove(idx);
    }
  }

  _doRemove(widgetIdx) {
    if (!this._pendingRemove) return;
    if (widgetIdx < 0 || widgetIdx >= this.widgets.length) return;
    const widgetInstance = this.widgets[widgetIdx];

    // 根据全局 widget 索引找到对应的组和组内索引
    let globalIdx = 0;
    for (const g of this.layout.groups) {
      const wList = g.widgets || [];
      if (widgetIdx < globalIdx + wList.length) {
        const localIdx = widgetIdx - globalIdx;
        wList.splice(localIdx, 1);
        if (wList.length === 0) {
          // 空组自动移除
          this.layout.groups = this.layout.groups.filter(gg => gg.id !== g.id);
        }
        break;
      }
      globalIdx += wList.length;
    }

    if (widgetInstance) widgetInstance.destroy();
    this.saveLayout();
    this.render();
    this._pendingRemove = false;
  }

  /** 紧凑排列：消除空行间隙 */
  _compactPositions() {
    if (!this.layout.groups) return;
    const cols = this._getColumnCount();
    this.layout.groups.forEach(group => {
      if (!group.widgets) return;
      const grid = new GridTracker(cols);
      group.widgets.forEach(item => {
        let size = item.size;
        if (cols === 1 && size === 'lg') size = 'md';
        else if (cols === 2 && size === 'lg') size = 'md';
        const pos = grid.findNextAvailable(size);
        item.position = { col: pos.col, row: pos.row };
        grid.occupy(pos.col, pos.row, size);
      });
    });
  }

  /** 手动触发紧凑（供外部调用） */
  compactAll() {
    this._compactPositions();
    this.saveLayout();
    this.render();
  }

  /** 组内移动 widget（SortableJS onEnd 回调） */
  _moveWidgetInGroup(groupId, fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const group = this.layout.groups.find(g => g.id === groupId);
    if (!group || !group.widgets) return;
    const [moved] = group.widgets.splice(fromIdx, 1);
    group.widgets.splice(toIdx, 0, moved);
    this.saveLayout();
    this.render();
  }

  /** 跨组移动 widget（供上下文菜单使用） */
  moveWidgetToGroup(widgetInstance, targetGroupId) {
    const sourceGroupId = widgetInstance.element?.dataset.groupId;
    if (!sourceGroupId || sourceGroupId === targetGroupId) return;

    const srcGroup = this.layout.groups.find(g => g.id === sourceGroupId);
    const dstGroup = this.layout.groups.find(g => g.id === targetGroupId);
    if (!srcGroup || !dstGroup) return;

    // 找到在 srcGroup.widgets 中的索引
    const globalIdx = this.widgets.indexOf(widgetInstance);
    if (globalIdx === -1) return;

    let srcIdx = -1;
    let counter = 0;
    for (const g of this.layout.groups) {
      for (let i = 0; i < (g.widgets || []).length; i++) {
        if (counter === globalIdx && g.id === sourceGroupId) {
          srcIdx = i;
          break;
        }
        counter++;
      }
      if (srcIdx >= 0) break;
    }

    if (srcIdx < 0) return;
    const [moved] = srcGroup.widgets.splice(srcIdx, 1);
    dstGroup.widgets.push(moved);

    // 移除空组
    this.layout.groups = this.layout.groups.filter(g => g.widgets.length > 0);

    this._compactPositions();
    this.saveLayout();
    this.render();
  }

  _enableDragDrop() {
    if (typeof Sortable === 'undefined') {
      console.warn('SortableJS 未加载，拖拽排序不可用');
      return;
    }

    // 销毁旧实例
    if (this._sortableInstances) {
      this._sortableInstances.forEach(s => s.destroy());
    }
    this._sortableInstances = [];

    this.container.querySelectorAll('.widget-group-grid').forEach(grid => {
      const groupId = grid.dataset.groupGrid;
      const sortable = new Sortable(grid, {
        animation: 300,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        handle: '.widget-content',
        draggable: '.widget',
        delay: 600,
        delayOnTouchOnly: true,
        touchStartThreshold: 5,
        filter: '',
        preventOnFilter: false,
        ghostClass: 'widget-ghost',
        chosenClass: 'widget-chosen',
        dragClass: 'widget-drag',
        onChoose: (evt) => {
          // 如果上下文菜单已打开，不启动拖拽视觉提示
          if (WidgetContextMenu.isVisible()) {
            evt.item.classList.remove('widget-waiting');
            return;
          }
          evt.item.classList.add('widget-waiting');
          if (navigator.vibrate) navigator.vibrate(10);
        },
        onUnchoose: (evt) => {
          evt.item.classList.remove('widget-waiting');
        },
        onStart: (evt) => {
          if (WidgetContextMenu.isVisible()) {
            WidgetContextMenu.dismiss();
          }
          evt.item.classList.remove('widget-waiting');
          evt.item.classList.add('widget-dragging');
        },
        onEnd: (evt) => {
          evt.item.classList.remove('widget-dragging', 'widget-waiting');
          if (evt.oldIndex === evt.newIndex) return;
          this._moveWidgetInGroup(groupId, evt.oldIndex, evt.newIndex);
        }
      });
      this._sortableInstances.push(sortable);
    });
  }

}
