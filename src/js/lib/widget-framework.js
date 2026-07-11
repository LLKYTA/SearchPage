/* ==========================================
   iOS 18 风格小组件框架 - WidgetFramework v2
   Spring 动画 · 增强拖拽 · 流畅生命周期
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

  /** 抖动（编辑模式） */
  animateJiggle(el) {
    const duration = 120;
    const degrees = 0.5;
    return el.animate([
      { transform: 'rotate(0deg)' },
      { transform: `${degrees}deg` },
      { transform: 'rotate(0deg)' },
      { transform: `-${degrees}deg` },
      { transform: 'rotate(0deg)' }
    ], { duration, iterations: Infinity, easing: this.curves.smooth });
  }
};

// ========== WidgetFramework 单例 ==========
const WidgetFramework = {
  registry: new Map(),
  areas: new Map(),
  storageKey: 'widgets-layout',

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
    'ai-tools': '<div class="preview-widget"><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;">' +
      [ ['ChatGPT','#10A37F'], ['Claude','#6B4FBB'], ['Midjourney','#1B1B1B'], ['Copilot','#0078D4'] ].map(([n,c]) =>
        `<div style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:6px;"><div style="width:20px;height:20px;border-radius:5px;background:${c};display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa fa-robot" style="color:white;font-size:10px;"></i></div><span style="font-size:10px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n}</span></div>`
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
      // Spring 回归
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

      // 添加按钮点击
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

    // Spring 入场动画（错位）
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

    // Spring 尺寸变化动画
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

  /**
   * 在 widget header 添加一个"+"按钮，统一管理入口
   * @param {string} [title='管理'] - 按钮 tooltip
   */
  _addHeaderAddBtn(title = '管理') {
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
    btn.title = title;
    btn.innerHTML = '<i class="fa fa-plus"></i>';
    btn.addEventListener('mouseenter', () => btn.style.color = 'var(--ios-blue)');
    btn.addEventListener('mouseleave', () => btn.style.color = 'var(--text-secondary)');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openManager();
    });
    actions.prepend(btn);
  }

  destroy() { this.element?.remove(); }
  openManager() {}
}

// ========== WidgetArea（Spring 动画版） ==========
class WidgetArea {
  constructor(container, id) {
    this.container = container;
    this.id = id;
    this.widgets = [];
    this.layout = [];
    this.sortableInstance = null;
    this._pendingRemove = false;
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
      // Spring 入场动画（错位）
      widget.animateIn(idx * 0.06);
      this.widgets.push(widget);
    });
  }

  addWidget(type, size) {
    const WidgetClass = WidgetFramework.registry.get(type);
    if (!WidgetClass) return false;
    const count = this.layout.filter(l => l.type === type).length;
    if (count >= (WidgetClass.maxPerArea || Infinity)) {
      alert(`该区域最多添加 ${WidgetClass.maxPerArea} 个"${WidgetClass.displayName}"`);
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
    if (this._pendingRemove) return;
    const idx = this.widgets.indexOf(widgetInstance);
    if (idx > -1) {
      const el = widgetInstance.element;
      if (el) {
        this._pendingRemove = true;
        // Spring 出场动画
        const anim = widgetInstance.animateOut();
        anim.finished.then(() => {
          this._doRemove(idx);
        }).catch(() => {
          // 动画被取消时的兜底
          this._doRemove(idx);
        });
        // 安全超时
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
    this.saveLayout();
    this.render();
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
