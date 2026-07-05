/* ==========================================
   iOS 风格小组件框架 - WidgetFramework
   支持：注册、多区域、拖拽排序(SortableJS)、尺寸切换、持久化、尺寸回调
   长按延迟：触屏设备按住 1 秒后进入拖拽状态
   ========================================== */
const WidgetFramework = {
  registry: new Map(),
  areas: new Map(),
  storageKey: 'widgets-layout',

  // ===== 各小组件预览内容 (展示实际效果) =====
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

  // ===== 3D 倾斜效果 =====
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
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
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
    };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
  },

  // ===== 打开小组件库（预览式） =====
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

      // 3D 倾斜
      this._initTilt(card);

      // 添加按钮点击
      card.querySelector('.gallery-card-add-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const area = WidgetFramework.areas.get(areaId);
        if (area) {
          const added = area.addWidget(type);
          if (added) {
            // 添加成功动效
            card.classList.add('gallery-card-added');
            setTimeout(() => card.classList.remove('gallery-card-added'), 600);
          }
        }
      });

      // 点击卡片整体也可添加
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

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // 触发入场动画
    requestAnimationFrame(() => {
      listContainer.querySelectorAll('.gallery-card-preview').forEach((c, i) => {
        c.style.setProperty('--card-delay', `${i * 0.04}s`);
        c.classList.add('gallery-card-visible');
      });
    });

    // 入场动画结束后移除 delay，使 3D 倾斜响应无延迟
    setTimeout(() => {
      listContainer.querySelectorAll('.gallery-card-preview').forEach(c => {
        c.style.removeProperty('--card-delay');
      });
    }, sortedEntries.length * 40 + 500);
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
    if (this._pendingRemove) return; // 已有移除操作在进行中
    const idx = this.widgets.indexOf(widgetInstance);
    if (idx > -1) {
      const el = widgetInstance.element;
      if (el) {
        this._pendingRemove = true;
        el.classList.add('widget-removing');
        el.addEventListener('animationend', () => {
          this._doRemove(idx);
        }, { once: true });
        // 安全兜底：动画超时后强制执行
        setTimeout(() => this._doRemove(idx), 400);
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