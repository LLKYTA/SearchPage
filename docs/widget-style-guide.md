# Widget 样式指南 (WIDGET_STYLE_GUIDE.md)

> 小组件一体化设计中的 CSS 变量体系、动画曲线和断点参考。
> 配合 `WIDGET_API.md` 和 `widget-template.js` 使用。

## CSS 变量体系

### 文字颜色

| 变量 | 亮色模式 | 暗色模式 | 用途 |
|------|----------|----------|------|
| `--text-primary` | #1D1D1F | #F5F5F7 | 主文字 |
| `--text-secondary` | #86868B | #98989D | 次级文字 |
| `--text-tertiary` | #C7C7CC | #636366 | 辅助文字 |

### 背景色

| 变量 | 亮色模式 | 暗色模式 | 用途 |
|------|----------|----------|------|
| `--card-bg` | #FFFFFF | #1C1C1E | 卡片背景 |
| `--bg-secondary` | #F2F2F7 | #2C2C2E | 次要背景 |
| `--bg-tertiary` | #E5E5EA | #3A3A3C | 三级背景 |
| `--accent-bg` | #E8F0FE | #1A2A4A | 高亮背景（用于图标容器） |

### 圆角

| 变量 | 值 | 用途 |
|------|-----|------|
| `--radius-sm` | 6px | 小元素（图标容器、输入框） |
| `--radius-md` | 10px | 中元素（设置卡片内部） |
| `--radius-dropdown` | 12px | 下拉菜单、小卡片 |
| `--radius-lg` | 16px | 弹窗内容 |
| `--radius-card` | 18px | **小组件卡片** |
| `--radius-xl` | 24px | 大容器 |

### 阴影

| 变量 | 用途 |
|------|------|
| `--shadow-color` | rgba(0,0,0,0.08)（亮色）/ rgba(0,0,0,0.3)（暗色） |

### 边距

| 变量 | 值 | 用途 |
|------|-----|------|
| `--widget-gap` | 16px | 小组件之间的间距 |

### iOS 品牌色

| 变量 | 值 | 用途 |
|------|-----|------|
| `--ios-blue` | #007AFF | 主题色、链接、可交互元素 |
| `--ios-green` | #34C759 | 完成状态、正向动作 |
| `--ios-red` | #FF3B30 | 删除、危险操作 |
| `--ios-purple` | #AF52DE | 装饰色 |
| `--ios-yellow` | #FF9500 | 天气图标等 |

### 边框

| 变量 | 亮色模式 | 暗色模式 | 用途 |
|------|----------|----------|------|
| `--card-border` | rgba(0,0,0,0.06) | rgba(255,255,255,0.08) | 卡片边框 |
| `--border-color` | #E5E5EA | #38383A | 分割线/边框 |

### 玻璃拟态

| 变量 | 用途 |
|------|------|
| `--glass-bg` | rgba(255,255,255,0.7)（亮色）/ rgba(28,28,30,0.85)（暗色） |
| `--backdrop-blur` | blur(20px) |
| `--glass-border` | 同 `--card-border` |

---

## 动画曲线

小组件框架内置了 Spring 动画曲线，通过 `Spring` 工具对象和 CSS 变量提供：

### CSS 变量

```css
.my-element {
    transition: transform 0.3s var(--spring-pop);
}
```

| 变量 | cubic-bezier | 用途 |
|------|-------------|------|
| `--spring-pop` | `(0.32, 0.72, 0, 1)` | 按钮按压、图标弹出、菜单打开 |
| `--spring-slide` | `(0.16, 1, 0.3, 1)` | 模态滑入、面板切换、列表移动 |
| `--spring-bounce` | `(0.34, 1.56, 0.64, 1)` | 入场动画、尺寸切换、徽章弹出 |
| `--spring-smooth` | `(0.4, 0, 0.2, 1)` | 悬停过渡、淡入淡出、颜色变化 |

### JavaScript 动画

```javascript
// 小组件入场
Spring.animateIn(element, delayMs);
// 小组件出场
Spring.animateOut(element);
// 尺寸变化脉冲
Spring.animateResize(element);
```

---

## 响应式断点

小组件网格的列数由 `WidgetArea._getColumnCount()` 动态计算，与 CSS media query 对齐：

| 视口宽度 | 网格列数 | 典型设备 |
|----------|----------|----------|
| ≤ 480px | 1 列 | 手机竖屏 |
| 481px ~ 768px | 2 列 | 平板竖屏/手机横屏 |
| ≥ 769px | 3 列 | 桌面/平板横屏 |

lg 尺寸在 2 列时自动降级为 md；lg/md 在 1 列时自动降级为 sm。

### CSS 响应式模式

小组件内容通过 `this.currentSize` (`'sm'|'md'|'lg'`) 来区分，而非直接依赖视口宽度：

```javascript
render() {
    const content = this.element.querySelector('.widget-content');
    if (this.currentSize === 'sm') {
        content.innerHTML = `...精简内容...`;
    } else {
        content.innerHTML = `...扩展内容...`;
    }
}
```

---

## 小组件尺寸规格

| 属性 | sm | md | lg |
|------|----|----|-----|
| 网格跨度 | 1 列 | 2 列 | 3 列 |
| 内容密度 | 紧凑 | 中等 | 完整 |
| 典型高度 | 自动 | 自动 | 自动 |
| 适用场景 | 时钟、单词卡片 | 天气+详情 | 全宽热榜 |

---

## 上下文菜单样式参考

上下文菜单是独立的浮动层（z-index: 10000），样式在 `widgets.css` 中：

```css
.widget-context-menu {
    background: var(--card-bg);
    border-radius: 14px;
    box-shadow: 0 12px 48px var(--shadow-color);
    padding: 6px;
    min-width: 150px;
    backdrop-filter: blur(20px);
}
```

菜单项：`.context-menu-item`（标准）、`.context-menu-item.destructive`（红色警示）
分隔线：`.context-menu-separator`
