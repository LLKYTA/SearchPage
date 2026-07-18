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
