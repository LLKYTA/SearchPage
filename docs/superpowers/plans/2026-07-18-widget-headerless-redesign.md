# 小组件无头化 + iOS 18 一体化设计 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将现有小组件框架从「header + content 分离」改造为「内容即设计」的 iOS 18 一体化模式，并开放开发者 API 文档。

**架构：** 
1. 移除 `Widget.createDOM()` 中的 `.widget-header` DOM 生成，改为只生成骨架容器
2. 新增 WidgetContextMenu 轻量上下文菜单系统（监听 `contextmenu` 事件）
3. Widget 基类新增 `getContextMenuItems()` 虚拟方法供子类自定义菜单项
4. 通过 `contextmenu` 事件统一覆盖桌面右键和移动端长按
5. SortableJS 拖拽 handle 从 `.widget-header, .widget-content` 切换为 `.widget-content`

**技术栈：** 原生 JS（ES6 class）、CSS custom properties、contextmenu 事件

---

## 文件变更总览

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `src/js/lib/widget-framework.js` | Widget 基类无头化 + ContextMenu 系统 |
| 修改 | `src/css/widgets.css` | 移除 header 样式，新增 context menu 样式 |
| 修改 | `src/js/widgets/shortcuts.js` | 移除 `_addHeaderAddBtn` 调用 |
| 修改 | `src/js/widgets/todo.js` | 移除 `_addHeaderAddBtn` 调用 |
| 修改 | `src/js/widgets/bookmarks.js` | 移除 `_addHeaderAddBtn` 调用 |
| 创建 | `WIDGET_API.md` | 开发者 API 文档 |
| 创建 | `src/js/widgets/widget-template.js` | 开发者模板文件 |

无需改动的 widget（4 个 — 内容自描述）：`clock.js`、`weather.js`、`hotboard.js`、`time-progress.js`、`daily-word.js`

---

### 任务 1：WidgetContextMenu 工具组件

**文件：**
- 修改：`src/js/lib/widget-framework.js`（追加在 Spring 工具之后，class Widget 之前）

在 widget-framework.js 的 `Spring` 对象之后、`GridTracker` 类之前（或 Widget 基类之前）插入一个轻量的 WidgetContextMenu 工具对象，用于创建和管理浮动上下文菜单。

- [ ] **步骤 1：在 widget-framework.js 中插入 WidgetContextMenu**

在 `Spring` 对象定义之后、`GridTracker` 类定义之前，插入以下代码：

```javascript
// ========== WidgetContextMenu — 浮动上下文菜单 ==========
const WidgetContextMenu = {
  _activeMenu: null,
  _activeWidget: null,

  show(event, widget, items) {
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
    if (this._activeMenu) {
      this._activeMenu.style.opacity = '0';
      this._activeMenu.style.transform = 'scale(0.92)';
      setTimeout(() => {
        if (this._activeMenu) {
          this._activeMenu.remove();
          this._activeMenu = null;
        }
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
```

- [ ] **步骤 2：Commit**

```bash
git add src/js/lib/widget-framework.js
git commit -m "feat: add WidgetContextMenu floating menu utility

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 2：Widget 基类 —— 简化 createDOM() + 添加 getContextMenuItems()

**文件：**
- 修改：`src/js/lib/widget-framework.js`（class Widget 部分）

将 Widget 基类的 DOM 生成从「header + content」简化为「仅 content」，并新增上下文菜单相关的虚拟方法。移除头部操作按钮相关的代码。

- [ ] **步骤 1：修改 `createDOM()` 移除 header**

将 `createDOM()` 方法替换为：

```javascript
createDOM() {
    const div = document.createElement('div');
    div.className = `widget widget-${this.currentSize}`;
    div.dataset.widgetType = this.constructor.type;
    div.innerHTML = `<div class="widget-content"></div>`;
    this.element = div;
    return div;
}
```

- [ ] **步骤 2：移除 `_bindHeaderActions()` 及 `_addHeaderAddBtn()`**

删除 `_bindHeaderActions()` 方法和 `_addHeaderAddBtn()` 方法（原第 310-417 行区域）。同时移除 constructor 中对 `_bindHeaderActions` 的调用——createDOM 不再需要它。

- [ ] **步骤 3：新增 `getContextMenuItems()` 和 `onContextMenu()`**

在 `render()` 方法定义之后、`onUpdate()` 之前，插入：

```javascript
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
```

- [ ] **步骤 4：修改 `destroy()` 清理菜单残留**

在 `destroy()` 方法中追加清理逻辑：

```javascript
destroy() {
    if (WidgetContextMenu._activeWidget === this) {
        WidgetContextMenu.dismiss();
    }
    this.element?.remove();
}
```

- [ ] **步骤 5：Commit**

```bash
git add src/js/lib/widget-framework.js
git commit -m "refactor: simplify Widget.createDOM() — remove header, add context menu API

- createDOM() now only generates .widget > .widget-content skeleton
- Removed _bindHeaderActions() and _addHeaderAddBtn()
- Added getContextMenuItems() for subclasses to customize menu items
- Added onContextMenu() handler that delegates to WidgetContextMenu
- destroy() now cleans up active context menu

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 3：WidgetArea —— 追加 contextmenu 事件监听 + 更新 Sortable handle

**文件：**
- 修改：`src/js/lib/widget-framework.js`（class WidgetArea 部分）

在 WidgetArea 的渲染循环中为每个 widget DOM 元素绑定 `contextmenu` 事件，并修改 SortableJS 的 handle 选择器。

- [ ] **步骤 1：在 render() 中追加 contextmenu 事件绑定**

在 `render()` 方法的 `this.container.appendChild(dom);` 之后（约第 526 行）、FLIP 动画之前，插入：

```javascript
// 绑定右键/长按上下文菜单
dom.addEventListener('contextmenu', (e) => {
    widget.onContextMenu(e);
});
```

- [ ] **步骤 2：修改 Sortable handle 选择器**

在 `_enableDragDrop()` 方法中（约第 736 行），将 `handle` 值从 `'.widget-header, .widget-content'` 改为 `'.widget-content'`：

```javascript
handle: '.widget-content',
```

- [ ] **步骤 3：Commit**

```bash
git add src/js/lib/widget-framework.js
git commit -m "feat: bind contextmenu event in WidgetArea, update SortableJS handle

- Each widget DOM now listens for contextmenu event (right-click / long press)
- SortableJS drag handle changed from '.widget-header, .widget-content' to '.widget-content'

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 4：CSS —— 移除 header 样式 + 添加 context menu 样式 + 调整 padding

**文件：**
- 修改：`src/css/widgets.css`

- [ ] **步骤 1：移除 header 相关 CSS 规则**

从 `widgets.css` 中删除以下内容（约第 69-174 行）：
- `.widget-header` 样式块（第 70-75 行）
- `.widget-icon` 样式块（第 77-88 行）
- `.widget-title` 样式块（第 90-96 行）
- `.widget-header-actions` 样式块（第 104-108 行）
- `.widget-size-btn` / `.widget-delete-btn` 样式块（第 110-145 行）
- `.widget-header-add-btn` 样式块（第 148-174 行）
- 响应式中 `.widget-header { margin-bottom: ... }` 规则（第 443-444 行、第 450 行）

使用 Edit 工具逐个删除。根据当前文件内容，具体替换为：

**删除 `.widget-header` 到 `}` 之间的全部规则**（包含 `.widget-header`, `.widget-icon`, `.widget-title` 三个完整样式块），将：

```css
/* ---------- 标题栏（iOS 18 简约风格） ---------- */
.widget-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
}

.widget-icon {
    color: var(--ios-blue);
    font-size: 10px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: var(--accent-bg);
    flex-shrink: 0;
}

.widget-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.2px;
    text-transform: uppercase;
}
```

替换为：

```css
/* 标题栏已移除 — 内容一体化设计 */
```

**删除 `.widget-header-actions` 及操作按钮相关样式**（`.widget-header-actions`, `.widget-size-btn`, `.widget-delete-btn`, `.widget-header-add-btn` 四个完整样式块），将：

```css
/* ---------- 头部操作按钮（始终可见但半透明） ---------- */
.widget-header-actions { ... }

.widget-size-btn, .widget-delete-btn { ... }

.widget-size-btn:hover { ... }

.widget-delete-btn:hover { ... }

/* 头部添加按钮 */
.widget-header-add-btn { ... }

.widget:hover .widget-header-add-btn { ... }

.widget-header-add-btn:hover { ... }
```

替换为：

```css
/* 操作按钮已迁移至上下文菜单 */
```

**在响应式区块中**，删除两处 `.widget-header { margin-bottom }`：

将：
```css
@media (max-width: 768px) {
    ...
    .widget-header { margin-bottom: 10px; }
}
```
删除 `.widget-header { margin-bottom: 10px; }` 这一行。

将：
```css
@media (max-width: 480px) {
    ...
    .widget-header { margin-bottom: 8px; }
}
```
删除 `.widget-header { margin-bottom: 8px; }` 这一行。

- [ ] **步骤 2：调整 widget 基础 padding**

为了弥补 header 移除后内容的视觉留白，将 `.widget` 的 padding 从 `18px 20px` 调整为 `16px 20px`（可在响应式区块中酌情调整）。

具体编辑：
```css
.widget {
    background: var(--card-bg);
    border-radius: var(--radius-card);
    padding: 18px 20px;    /* 改为 16px 20px */
```

- [ ] **步骤 3：追加 context menu CSS 样式**

在 `widgets.css` 末尾追加：

```css
/* ========== 上下文菜单（WidgetContextMenu） ========== */
.widget-context-menu {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 14px;
    box-shadow: 0 12px 48px var(--shadow-color), 0 2px 8px rgba(0,0,0,0.06);
    padding: 6px;
    min-width: 150px;
    transform-origin: top left;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
}

.context-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s ease;
    white-space: nowrap;
}

.context-menu-item:hover {
    background: var(--bg-tertiary);
}

.context-menu-item.destructive {
    color: var(--ios-red);
}

.context-menu-item.destructive:hover {
    background: rgba(255, 59, 48, 0.1);
}

.context-menu-icon {
    font-size: 16px;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
}

.context-menu-label {
    flex: 1;
}

.context-menu-separator {
    height: 1px;
    background: var(--border-color);
    margin: 4px 8px;
}

/* 纯深色模式覆盖 */
.dark .widget-context-menu {
    background: var(--dark-bg-secondary, #1C1C1E);
    border-color: var(--dark-border-color, #38383A);
}
```

- [ ] **步骤 4：Commit**

```bash
git add src/css/widgets.css
git commit -m "style: remove widget header styles, add context menu styles

- Removed .widget-header, .widget-icon, .widget-title styles
- Removed .widget-header-actions, .widget-size-btn, .widget-delete-btn, .widget-header-add-btn
- Removed responsive header margin rules
- Adjusted widget padding from 18px 20px to 16px 20px
- Added .widget-context-menu, .context-menu-item, .context-menu-separator styles

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 5：改造快捷方式小组件（移除 `_addHeaderAddBtn`）

**文件：**
- 修改：`src/js/widgets/shortcuts.js`

- [ ] **步骤 1：移除 `_addHeaderAddBtn` 调用**

在 `render()` 方法中，删除 `this._addHeaderAddBtn('添加快捷方式');` 这一行。`openManager()` 现在通过上下文菜单自动发现并展示。

将：
```javascript
render() {
    this._addHeaderAddBtn('添加快捷方式');
    const content = this.element.querySelector('.widget-content');
    content.innerHTML = '<div class="shortcuts-grid"></div>';
    this._render();
}
```
改为：
```javascript
render() {
    const content = this.element.querySelector('.widget-content');
    content.innerHTML = '<div class="shortcuts-grid"></div>';
    this._render();
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/js/widgets/shortcuts.js
git commit -m "refactor: remove _addHeaderAddBtn from shortcuts — now uses context menu

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 6：改造待办事项小组件（移除 `_addHeaderAddBtn`）

**文件：**
- 修改：`src/js/widgets/todo.js`

- [ ] **步骤 1：移除 `_addHeaderAddBtn` 调用**

将：
```javascript
render() {
    this._addHeaderAddBtn('添加待办');
    const content = this.element.querySelector('.widget-content');
    content.innerHTML = '<div class="todo-list"></div>';
    this._loadTodos();
}
```
改为：
```javascript
render() {
    const content = this.element.querySelector('.widget-content');
    content.innerHTML = '<div class="todo-list"></div>';
    this._loadTodos();
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/js/widgets/todo.js
git commit -m "refactor: remove _addHeaderAddBtn from todo — now uses context menu

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 7：改造书签小组件（移除 `_addHeaderAddBtn`）

**文件：**
- 修改：`src/js/widgets/bookmarks.js`

- [ ] **步骤 1：移除 `_addHeaderAddBtn` 调用**

将：
```javascript
render() {
    this._addHeaderAddBtn('添加书签');
    const content = this.element.querySelector('.widget-content');
    content.innerHTML = '<div class="bookmarks-grid"></div>';
    this._renderBookmarks();
}
```
改为：
```javascript
render() {
    const content = this.element.querySelector('.widget-content');
    content.innerHTML = '<div class="bookmarks-grid"></div>';
    this._renderBookmarks();
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/js/widgets/bookmarks.js
git commit -m "refactor: remove _addHeaderAddBtn from bookmarks — now uses context menu

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 8：开发者 API 文档

**文件：**
- 创建：`WIDGET_API.md`
- 创建：`src/js/widgets/widget-template.js`

- [ ] **步骤 1：创建 WIDGET_API.md**

```markdown
# Widget API — 小组件开发者指南

> KD 起始页使用轻量级小组件框架（WidgetFramework v3），
> 支持 iOS 18 风格的无头一体化设计。
> 本文档指导开发者如何创建自己的小组件。

## 快速开始

创建一个小组件只需要 4 步：

### 1. 继承 Widget

```javascript
class MyWidget extends Widget {
    // ...
}
```

### 2. 定义静态元信息

```javascript
static type = 'my-widget';       // 全局唯一标识
static displayName = '我的小组件'; // 显示名称
static defaultSize = 'sm';       // 默认尺寸 'sm' | 'md' | 'lg'
static icon = 'fa-star';         // FontAwesome 4 图标类名
static maxPerArea = 1;           // （可选）同区域上限，默认无限
```

### 3. 实现 render()

```javascript
render() {
    const content = this.element.querySelector('.widget-content');
    content.innerHTML = `<p>Hello, World!</p>`;
}
```

### 4. 注册

```javascript
WidgetFramework.register('my-widget', MyWidget);
```

然后添加 `<script>` 标签到 `index.html`（小组件区域，在 `app.js` 之前）。

---

## 生命周期

| 方法 | 必需 | 触发时机 |
|------|------|----------|
| `render()` | ✅ | 每次需要渲染内容时（初始化、尺寸切换、数据更新） |
| `onResize(size)` | ❌ | 尺寸切换后触发，`size` 为 `'sm'`/`'md'`/`'lg'` |
| `onUpdate()` | ❌ | 外部数据更新通知时触发 |
| `openManager()` | ❌ | 打开管理弹窗（需配合上下文菜单） |
| `destroy()` | ❌ | 组件被移除时（清理定时器/事件监听） |
| `getContextMenuItems()` | ❌ | 返回自定义菜单项（见下文） |

### render()

小组件的唯一渲染入口。将 HTML 渲染到 `this.element.querySelector('.widget-content')` 中。

```javascript
render() {
    const content = this.element.querySelector('.widget-content');
    // this.currentSize 可读取当前尺寸：'sm' | 'md' | 'lg'
    // 根据尺寸调整内容布局
    if (this.currentSize === 'sm') {
        content.innerHTML = `<div class="compact">...</div>`;
    } else {
        content.innerHTML = `<div class="expanded">...</div>`;
    }
}
```

### onResize(size)

当用户通过上下文菜单切换尺寸时调用。`size` 参数是新尺寸。

```javascript
onResize(size) {
    // 尺寸已切换完毕，this.currentSize 已更新
    this.fetchDataForSize(size);
    this.render();
}
```

### destroy()

清理定时器、事件监听等，防止内存泄漏。

```javascript
destroy() {
    clearInterval(this.timer);
    super.destroy();
}
```

---

## 上下文菜单自定义

默认右键/长按触发上下文菜单，包含「切换尺寸」和「移除小组件」。

通过覆盖 `getContextMenuItems()` 追加自定义菜单项：

```javascript
getContextMenuItems() {
    // 先获取父级默认菜单
    const items = super.getContextMenuItems();

    // 在「切换尺寸」之后插入自定义菜单项
    items.splice(1, 0, {
        id: 'refresh',
        label: '刷新数据',
        icon: '🔄',
        action: () => this.refreshData()
    });

    return items;
}
```

### 菜单项格式

```javascript
{
    id: 'unique-id',          // 唯一标识
    label: '显示文字',         // 菜单文字
    icon: '🔃',               // （可选）Emoji 图标
    destructive: false,        // （可选）红色警示样式
    action: () => { /* ... */ } // 点击执行函数
}
```

使用 `{ type: 'separator' }` 插入分隔线。

---

## 管理弹窗

如果小组件需要管理界面，实现 `openManager()` 方法：

```javascript
openManager() {
    window.currentManageWidget = this;
    document.getElementById('manage-modal-title').textContent = '管理我的数据';
    const container = document.getElementById('manage-list-container');
    container.innerHTML = '<!-- 渲染管理界面 -->';
    window.manageModal?.open();
}
```

框架会自动检测 `openManager()` 是否被覆盖，并在上下文菜单中显示「管理」入口。

---

## 数据持久化

每个小组件自行管理其数据，使用 `localStorage`：

```javascript
// 保存
const data = JSON.parse(localStorage.getItem('my-widget-data') || '[]');
data.push({ text: '新项目' });
localStorage.setItem('my-widget-data', JSON.stringify(data));

// 读取
const data = JSON.parse(localStorage.getItem('my-widget-data') || '[]');
```

数据 key 建议以 widget 类型为前缀，避免冲突。

---

## 样式指南

### CSS 变量

小组件自动处于 `var()` 主题系统中：

```css
.my-widget-container {
    color: var(--text-primary);       /* 主文字色 */
    background: var(--bg-secondary);   /* 背景色 */
    border-radius: var(--radius-md);  /* 圆角 */
    font-size: 13px;
}
```

所有可用变量参见 `src/css/variables.css`。

### 尺寸响应

```css
/* 基础样式 */
.my-widget-text { font-size: 14px; }

/* 卡片尺寸由框架管理，内容样式按需适配 */
```

### 动画曲线

```css
.my-widget-item {
    transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
```

可用曲线：
- `var(--spring-pop)` — 弹性弹出
- `var(--spring-slide)` — 平滑滑动
- `var(--spring-bounce)` — 弹性回弹
- `var(--spring-smooth)` — 平滑过渡

---

## 完整示例

参见 `src/js/widgets/widget-template.js` 获取可复制的最小模板。
```

- [ ] **步骤 2：创建 widget-template.js**

```javascript
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
```

- [ ] **步骤 3：Commit**

```bash
git add WIDGET_API.md src/js/widgets/widget-template.js
git commit -m "docs: add WIDGET_API.md and widget-template.js for developers

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 9：端到端验证

验证所有修改在浏览器中正常工作。

- [ ] **步骤 1：启动本地服务器并打开**

```bash
python3 -m http.server 8080
```

然后在浏览器中打开 `http://localhost:8080`。

- [ ] **步骤 2：验证清单**

逐项验证以下行为：

1. **所有小组件正常渲染** — 时钟、天气、快捷方式、待办、书签、热榜、时间进度、每日单词无报错
2. **无 header 痕迹** — 所有卡片没有显示「时间」「天气」等标题栏
3. **右键/长按弹出菜单** — 在任何小组件上右键点击，看到浮动菜单
4. **菜单项完整** — 菜单包含「切换尺寸」和「移除小组件」（有 openManager 的 widget 还有「管理」）
5. **尺寸切换** — 通过菜单切换尺寸，卡片大小变化，内容自适应
6. **移除小组件** — 通过菜单移除，伴随缩放淡出动画
7. **拖拽排序** — 长按/拖动卡片进行排序（注意：拖拽 handle 已改为 `.widget-content`）
8. **添加工件** — 通过底部「+」按钮打开 gallery 添加新 widget
9. **快捷方式/待办/书签管理** — 右键 → 「管理」打开编辑弹窗

- [ ] **步骤 3：修复发现的问题**

如果某个 widget 渲染异常，检查：
- 是否有 widget 的 `render()` 中引用了不存在的 `.widget-header` 元素
- 是否有 CSS 依赖了已删除的类名

- [ ] **步骤 4：提交验证后的最终 commit**

```bash
git add -A
# 如果验证后没有额外修改，则跳过此步骤
```

---

## 自检

**1. 规格覆盖度：**
- 取消 header 设计 → 任务 2（createDOM 改造）+ 任务 4（CSS 移除）
- 上下文菜单系统 → 任务 1（WidgetContextMenu）+ 任务 2（getContextMenuItems/onContextMenu）+ 任务 3（事件绑定）
- 8 个小组件改造 → 任务 5/6/7（3 个需要改的）+ 另外 5 个无需改动
- 开发者 API → 任务 8（WIDGET_API.md + template）
- 开放注册 → 现有 `WidgetFramework.register()` 不变

**2. 占位符扫描：** ✅ 无 TODO / 待定

**3. 类型一致性：** ✅ `getContextMenuItems()` 返回格式在任务 1、2、8 中一致
