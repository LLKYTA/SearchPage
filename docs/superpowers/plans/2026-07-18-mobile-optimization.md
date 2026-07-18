# 移动端体验优化实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为小组件添加移动端长按触发上下文菜单功能，并优化 480px 以下单列布局的内容密度

**架构：**
- 长按菜单：在 Widget 基类 `createDOM()` 注入 touch 事件处理器，通过 500ms 定时器 + 10px 位移阈值区分"长按菜单"与"拖拽"
- 单列优化：修改 `_layoutGroupForBreakpoint` 的一行逻辑 + CSS 间距和触摸目标调整

**技术栈：** 原生 JS（无框架）、CSS Custom Properties、SortableJS

---

### 任务 1：Widget 基类 — 长按触摸事件处理器

**文件：**
- 修改：`src/js/lib/widget-framework.js`（在 Widget 类的 `createDOM()` 方法后新增 `_initLongPress()` 方法）

**说明：**
Widget 基类当前已有 `createDOM()` 和 `onContextMenu()`。需要新增 `_initLongPress()` 方法，通过 touch 事件实现移动端长按触发 `onContextMenu()`。手势区分逻辑：手指按下启动 500ms 定时器，移动超过 10px 则取消（让 SortableJS 处理拖拽），500ms 到则弹出菜单。

- [ ] **步骤 1：在 Widget 类中新增 `_initLongPress()` 方法**

在 `onContextMenu(event)` 方法之后、`destroy()` 方法之前插入以下代码：

```javascript
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
          preventDefault: () => e.preventDefault(),
          target: el,
        };
        // 阻止浏览器原生 contextmenu
        el.addEventListener('contextmenu', function preventNative(e) {
          e.preventDefault();
          el.removeEventListener('contextmenu', preventNative);
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
```

- [ ] **步骤 2：在 `createDOM()` 末尾调用 `_initLongPress()`**

在 `createDOM()` 方法的 `return div;` 之前添加：

```javascript
    // 初始化移动端长按手势
    this._initLongPress();
```

- [ ] **步骤 3：在 `destroy()` 中清理长按事件**

在 `destroy()` 方法中 `this.element?.remove();` 之前添加：

```javascript
    if (this._longPressCleanup) {
      this._longPressCleanup();
      this._longPressCleanup = null;
    }
```

- [ ] **步骤 4：验证代码可运行**

运行：`python3 -m http.server 8080` 并在浏览器打开，确保页面加载无 JS 错误。

---

### 任务 2：SortableJS onChoose 适配 — 长按菜单与拖拽共存

**文件：**
- 修改：`src/js/lib/widget-framework.js`（`_enableDragDrop()` 方法）

**说明：**
当长按已打开菜单时，SortableJS 的 `onChoose` 不应添加拖拽类或震动（因为菜单已经弹出了）。用户在长按菜单打开后如果继续移动手指，SortableJS 可能仍然会触发拖拽流程。需要在 `onChoose` 中检测菜单是否可见，如果是则跳过拖拽提示。

- [ ] **步骤 1：修改 `onChoose` 回调检测菜单状态**

找到 `_enableDragDrop()` 中 `onChoose` 回调（约第 968 行），修改为：

```javascript
        onChoose: (evt) => {
          // 如果上下文菜单已打开，不启动拖拽视觉提示
          if (WidgetContextMenu.isVisible()) {
            evt.item.classList.remove('widget-waiting');
            return;
          }
          evt.item.classList.add('widget-waiting');
          if (navigator.vibrate) navigator.vibrate(10);
        },
```

- [ ] **步骤 2：修改 `onStart` 检测菜单状态**

```javascript
        onStart: (evt) => {
          if (WidgetContextMenu.isVisible()) {
            WidgetContextMenu.dismiss();
          }
          evt.item.classList.remove('widget-waiting');
          evt.item.classList.add('widget-dragging');
        },
```

- [ ] **步骤 3：验证长按 + 拖拽切换**

在浏览器手机模式下测试：长按小组件 → 菜单弹出一开始拖拽 → 菜单关闭 → 拖拽排序。确认两者不会同时卡住。

---

### 任务 3：单列布局 — 修改强制 sm 逻辑

**文件：**
- 修改：`src/js/lib/widget-framework.js`（`_layoutGroupForBreakpoint()` 方法，约第 731 行）

**说明：**
当前 `cols === 1` 时所有 widget 被强制为 `sm`，导致内容稀疏。改为仅把 `lg` 降为 `md`，保留 `sm` 和 `md` 原样。

- [ ] **步骤 1：修改 size 强制逻辑**

将：

```javascript
      if (cols === 1) {
        size = 'sm';
      }
```

改为：

```javascript
      if (cols === 1 && size === 'lg') {
        size = 'md';
      }
```

- [ ] **步骤 2：验证布局效果**

在浏览器切换到 480px 以下宽度，确认原本为 `md` 的小组件（如书签、热榜）展示更丰富内容，`sm` 组件不变。

---

### 任务 4：CSS 单列布局间距优化

**文件：**
- 修改：`src/css/widgets.css`

**说明：**
480px 以下单列模式，调整间距和触摸使用体验。

- [ ] **步骤 1：优化单列间距和触摸目标**

在文件末尾 `@media (max-width: 480px)` 规则块中修改为：

```css
@media (max-width: 480px) {
    .widgets-area { grid-template-columns: 1fr; gap: 8px; }
    .shortcuts-grid, .bookmarks-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .widget { padding: 12px; border-radius: var(--radius-dropdown); }
    .time-display { font-size: 24px; }
    .weather-temp { font-size: 22px; }
    .weather-icon { font-size: 24px; }
    .hotboard-list { max-height: 260px; }
    .hotboard-item { padding: 10px 8px; }
    .hotboard-title { font-size: 13px; }
    /* 触摸目标放大 */
    .bookmark-item { padding: 10px; min-height: 44px; }
    .shortcut-item { min-height: 44px; }
    .todo-item { min-height: 36px; }
    .todo-checkbox { width: 22px; height: 22px; }
}
```

注意：需要找到已有的 `@media (max-width: 480px)` 块（约第 418-422 行），将其替换为上述内容。

- [ ] **步骤 2：验证 CSS 覆盖**

确认 480px 断点下：间距缩小、触摸目标 ≥44px、热榜展示更多行。

---

### 任务 5：WidgetContextMenu 触摸友好增强

**文件：**
- 修改：`src/js/lib/widget-framework.js`

**说明：**
WidgetContextMenu 当前使用 `pointerdown` 关闭菜单，但在移动端触摸菜单项时可能误关。需要让菜单项点击时阻止事件冒泡，并确保菜单项的 touchend 不会被外部 dismiss 拦截。

- [ ] **步骤 1：在菜单项点击中增加阻止传播**

找到 `show()` 方法中创建菜单项的循环（约第 87 行），在其 `click` 处理器中增加 `e.stopPropagation()`：

```javascript
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss();
        item.action();
      });
```

以及增加 touch 事件兼容：

```javascript
      btn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        this.dismiss();
        item.action();
      });
```

- [ ] **步骤 2：验证菜单点击**

手机模式下打开菜单，点击菜单项，确认操正确执行且菜单关闭后不会立即弹出新的长按菜单。

---

### 任务 6：Commit

- [ ] **步骤 1：Commit 所有改动**

```bash
git add src/js/lib/widget-framework.js src/css/widgets.css
git commit -m "feat: 移动端长按打开上下文菜单 + 单列布局优化

- Widget 基类新增 _initLongPress() 实现长按手势（500ms + 10px 位移阈值）
- SortableJS onChoose 适配菜单可见态，避免与长按冲突
- 单列布局只降级 lg→md，保留 md 展示更丰富内容
- CSS 优化 480px 断点间距、触摸目标（≥44px）、热榜高度

Co-Authored-By: Claude <noreply@anthropic.com>"
```
