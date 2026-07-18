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
  _layoutVersion: 2,         // 当前布局版本

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

    const cols = area._getColumnCount();
    const span = area._span(newSize, cols);
    const item = area.layout[this.index];

    // 更新布局中的尺寸
    if (item) {
      item.size = newSize;

      // 检查位置是否溢出，如有必要则找新位置
      if (item.position) {
        const maxCol = cols - span + 1;
        if (item.position.col > maxCol) {
          // 超出右边界 → 找空位
          const grid = area._buildOccupiedGrid();
          // 先清除自己原占位
          grid.clear(item.position.col, item.position.row, current);
          const newPos = grid.findNextAvailable(newSize);
          item.position = { col: newPos.col, row: newPos.row };
          grid.occupy(newPos.col, newPos.row, newSize);
        }
      }

      area.saveLayout();
    }

    // 更新 DOM
    this.element.classList.remove(`widget-${current}`);
    this.element.classList.add(`widget-${newSize}`);
    this.currentSize = newSize;

    // 更新内联网格定位
    if (item && item.position) {
      this.element.style.gridColumn = `${item.position.col} / span ${Math.min(span, cols)}`;
      this.element.style.gridRow = `${item.position.row} / span 1`;
      this.element.dataset.position = JSON.stringify(item.position);
    }

    Spring.animateResize(this.element);
    this.onResize(newSize);
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

  getContextMenuItems() {
    const items = [];
    items.push({ id: 'size', label: '切换尺寸', icon: '🔃', action: () => this.cycleSize() });
    if (this.openManager !== Widget.prototype.openManager) {
        items.push({ id: 'manage', label: '管理', icon: '✏️', action: () => this.openManager() });
    }
    items.push({ type: 'separator' });
    items.push({ id: 'delete', label: '移除小组件', icon: '🗑️', destructive: true, action: () => {
        const areaId = this.container.closest('[data-widget-area]').dataset.widgetArea;
        WidgetFramework.areas.get(areaId)?.removeWidget(this);
    }});
    return items;
  }

  onContextMenu(event) {
    event.preventDefault();
    WidgetContextMenu.show(event, this, this.getContextMenuItems());
  }

  destroy() {
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
    this.layout = [];
    this.sortableInstance = null;
    this._pendingRemove = false;
    this._lastCols = 3;
    this._resizeHandler = null;
  }

  init() {
    this.loadLayout();
    this.render();
    this._enableDragDrop();
    this._initResizeObserver();
  }

  // ===== 布局持久化 =====

  loadLayout() {
    const all = WidgetFramework.getLayout();
    const version = all._version || 1;
    const areaLayout = all[this.id] || this._getDefaultLayout();

    if (version < WidgetFramework._layoutVersion) {
      this._migrateLayout(areaLayout, version);
      all[this.id] = areaLayout;
      all._version = WidgetFramework._layoutVersion;
      WidgetFramework.saveLayout(all);
    }

    this.layout = areaLayout;
  }

  /** 迁移旧布局：自动计算初始位置 */
  _migrateLayout(layout, fromVersion) {
    if (fromVersion >= 2) return;
    const cols = this._getColumnCount();
    const grid = new GridTracker(cols);
    layout.forEach(item => {
      const WidgetClass = WidgetFramework.registry.get(item.type);
      const defaultSize = WidgetClass ? WidgetClass.defaultSize : 'sm';
      const size = item.size || defaultSize;
      delete item.position;
      const pos = grid.findNextAvailable(size);
      item.position = { col: pos.col, row: pos.row };
      item.size = size; // 补齐缺失的 size
      grid.occupy(pos.col, pos.row, size);
    });
  }

  _getDefaultLayout() {
    const str = this.container.dataset.defaultWidgets;
    if (!str) return [];
    try {
      return JSON.parse(str);
    } catch {
      return [];
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
    // FLIP：捕获旧位置
    const oldRects = new Map();
    this.container.querySelectorAll('.widget').forEach(el => {
      const key = el.dataset.widgetType + '_' + el.dataset.position;
      oldRects.set(key, el.getBoundingClientRect());
    });

    this.container.innerHTML = '';
    this.widgets = [];

    const cols = this._getColumnCount();
    this._lastCols = cols;

    // 计算当前断点下的布局
    const positioned = this._layoutForBreakpoint(cols);

    positioned.forEach((item, sortIndex) => {
      const WidgetClass = WidgetFramework.registry.get(item.type);
      if (!WidgetClass) return;
      const widget = new WidgetClass(this.container, sortIndex);
      const dom = widget.createDOM();

      // 显式网格定位
      const span = this._span(item.size, cols);
      const pos = item.position || { col: 1, row: 1 };
      dom.style.gridColumn = `${pos.col} / span ${span}`;
      dom.style.gridRow = `${pos.row} / span 1`;
      dom.dataset.position = JSON.stringify(pos);

      this.container.appendChild(dom);
      widget.render();

      // FLIP 动画：从旧位置过渡到新位置
      const key = dom.dataset.widgetType + '_' + dom.dataset.position;
      const old = oldRects.get(key);
      if (old) {
        const now = dom.getBoundingClientRect();
        const dx = old.left - now.left;
        const dy = old.top - now.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          dom.animate([
            { transform: `translate(${dx}px, ${dy}px)`, opacity: 0.6 },
            { transform: 'translate(0, 0)', opacity: 1 }
          ], { duration: 400, easing: Spring.curves.slide });
        } else {
          widget.animateIn(sortIndex * 0.06);
        }
      } else {
        widget.animateIn(sortIndex * 0.06);
      }

      this.widgets.push(widget);
    });
  }

  /** 根据当前列数适配布局 */
  _layoutForBreakpoint(cols) {
    if (cols === 3) {
      return this.layout.map(item => ({
        ...item,
        position: item.position || { col: 1, row: 1 }
      }));
    }
    // 2列或1列：重新计算位置，消除空行
    const grid = new GridTracker(cols);
    return this.layout.map(item => {
      let size = item.size;
      if (cols === 1) {
        size = 'sm';
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
    if (this.sortableInstance) {
      this.sortableInstance.destroy();
    }
  }

  // ===== Widget 增删改 =====

  addWidget(type, size) {
    const WidgetClass = WidgetFramework.registry.get(type);
    if (!WidgetClass) return false;
    const count = this.layout.filter(l => l.type === type).length;
    if (count >= (WidgetClass.maxPerArea || Infinity)) {
      alert(`该区域最多添加 ${WidgetClass.maxPerArea} 个"${WidgetClass.displayName}"`);
      return false;
    }

    const cols = this._getColumnCount();
    const grid = new GridTracker(cols);
    this.layout.forEach(item => {
      if (item.position) {
        grid.occupy(item.position.col, item.position.row, item.size || 'sm');
      }
    });

    const newSize = size || WidgetClass.defaultSize || 'sm';
    const pos = grid.findNextAvailable(newSize);

    const newItem = {
      type,
      size: newSize,
      config: {},
      position: pos
    };
    this.layout.push(newItem);
    this.saveLayout();
    this.render();
    return true;
  }

  removeWidget(widgetInstance) {
    if (this._pendingRemove) return;
    const idx = this.widgets.indexOf(widgetInstance);
    if (idx > -1) {
      const el = widgetInstance.element;
      if (el) {
        this._pendingRemove = true;
        const anim = widgetInstance.animateOut();
        anim.finished.then(() => {
          this._doRemove(idx);
        }).catch(() => {
          this._doRemove(idx);
        });
        setTimeout(() => this._doRemove(idx), 500);
      } else {
        this._doRemove(idx);
      }
    }
  }

  _doRemove(idx) {
    if (!this._pendingRemove) return;
    this._pendingRemove = false;

    if (idx < 0 || idx >= this.layout.length) return;
    const widgetInstance = this.widgets[idx];
    this.layout.splice(idx, 1);
    this.widgets.splice(idx, 1);
    if (widgetInstance) widgetInstance.destroy();

    // 移除后紧凑排列
    this._compactPositions();

    this.saveLayout();
    this.render();
  }

  /** 紧凑排列：消除空行间隙 */
  _compactPositions() {
    const cols = this._getColumnCount();
    const grid = new GridTracker(cols);
    this.layout.forEach(item => {
      if (!item.position) return;
      const pos = grid.findNextAvailable(item.size || 'sm');
      item.position = { col: pos.col, row: pos.row };
      grid.occupy(pos.col, pos.row, item.size || 'sm');
    });
  }

  /** 手动触发紧凑（供外部调用） */
  compactAll() {
    this._compactPositions();
    this.saveLayout();
    this.render();
  }

  moveWidget(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;

    // 更新 layout 数组顺序
    const movedLayout = this.layout.splice(fromIdx, 1)[0];
    this.layout.splice(toIdx, 0, movedLayout);
    this.widgets.splice(fromIdx, 1);
    this.widgets.splice(toIdx, 0, null); // 占位

    // 重新紧凑排列
    this._compactPositions();
    this.saveLayout();
    // 重渲染以生效网格位置变化
    this.render();
  }

  _enableDragDrop() {
    if (typeof Sortable === 'undefined') {
      console.warn('SortableJS 未加载，拖拽排序不可用');
      return;
    }

    if (this.sortableInstance) {
      this.sortableInstance.destroy();
      this.sortableInstance = null;
    }

    this.sortableInstance = new Sortable(this.container, {
      animation: 300,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      handle: '.widget-header, .widget-content',
      draggable: '.widget',

      delay: 400,
      delayOnTouchOnly: true,
      touchStartThreshold: 3,

      filter: '.widget-size-btn, .widget-delete-btn, .widget-header-add-btn',
      preventOnFilter: false,

      ghostClass: 'widget-ghost',
      chosenClass: 'widget-chosen',
      dragClass: 'widget-drag',

      onChoose: (evt) => {
        const el = evt.item;
        el.classList.add('widget-waiting');
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      },

      onUnchoose: (evt) => {
        const el = evt.item;
        el.classList.remove('widget-waiting');
      },

      onStart: (evt) => {
        const el = evt.item;
        el.classList.remove('widget-waiting');
        el.classList.add('widget-dragging');
      },

      onEnd: (evt) => {
        const el = evt.item;
        el.classList.remove('widget-dragging', 'widget-waiting');

        if (evt.oldIndex !== evt.newIndex) {
          this.moveWidget(evt.oldIndex, evt.newIndex);
        }
      }
    });
  }

}
