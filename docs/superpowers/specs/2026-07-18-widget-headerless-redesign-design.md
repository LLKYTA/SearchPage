# 设计规格：小组件无头化 + iOS 18 一体化设计

> **日期**: 2026-07-18
> **状态**: 已批准（通过 brainstorming 流程）
> **影响范围**: widget-framework.js / widgets.css / widgets/*.js / WIDGET_API.md

---

## 1. 概述

将现有小组件框架从「header + content 分离」模式改造为「内容即设计」的 iOS 18 一体化模式，同时提供规范的开发者 API 文档。

### 目标

1. **取消头部设计** — 移除 `.widget-header` DOM 结构，让小组件内容直接占据卡片全部空间
2. **统一操作入口** — 用长按/右键上下文菜单替代 header 中的操作按钮
3. **改造 8 个已有小组件** — 每个小组件通过内容自描述、内嵌标签或品牌背景实现自我标识
4. **开放开发者 API** — 提供 WIDGET_API.md、模板文件和样式指南，第三方开发者可零门槛创建小组件

---

## 2. 架构变更

### 2.1 Widget 基类 DOM 骨架变化

**改造前**（当前 v3 框架）:
```html
<div class="widget widget-sm">
  <div class="widget-header">          <!-- ❌ 移除 -->
    <i class="fa ... widget-icon"></i>
    <span class="widget-title">标题</span>
    <div class="widget-header-actions">
      <button class="widget-size-btn">↔</button>
      <button class="widget-delete-btn">✕</button>
    </div>
  </div>
  <div class="widget-content"></div>    <!-- ✅ 保留 -->
</div>
```

**改造后**:
```html
<div class="widget widget-sm" data-widget-type="clock">
  <div class="widget-content"></div>    <!-- Widget 完全掌控内容区 -->
</div>
```

### 2.2 基类 API 变更

| 方法 | 变化 |
|------|------|
| `createDOM()` | 简化：只生成 `.widget > .widget-content` 骨架 |
| `render()` | 不变 — Widget 自行渲染 `.widget-content` |
| `_bindHeaderActions()` | ❌ 删除 — 由 ContextMenu 系统管理 |
| `_addHeaderAddBtn()` | ❌ 删除 — 通过菜单 `openManager()` 触发 |
| `getContextMenuItems()` | 🆕 新增 — 返回自定义菜单项数组 |
| `onContextMenu(event)` | 🆕 新增 — 长按/右键弹出上下文菜单 |
| `cycleSize()` | 不变 — 但触发入口改为上下文菜单 |

### 2.3 ContextMenu 菜单系统

**触发方式**:
- 桌面端：右键点击 → 直接弹出
- 桌面端备选：长按 ≥ 600ms → 弹出
- 移动端：长按 ≥ 500ms + 震动反馈 → 弹出
- 与 SortableJS 拖拽的长按共用延迟机制（400ms 拖拽启动 vs 500ms 菜单启动）

**默认菜单结构**:
```
┌─────────────────────┐
│ 🔃 切换尺寸         │  ← 默认，不可覆盖
│ ✏️ 管理内容         │  ← 仅当子类覆盖了 openManager() 时出现
│─────────────────────│
│ 🗑️ 移除小组件       │  ← 默认，不可覆盖（红色/警示样式）
└─────────────────────┘
```

**自定义追加**:
```javascript
getContextMenuItems() {
    const items = super.getContextMenuItems();
    items.splice(1, 0, { id: 'refresh', label: '刷新数据', icon: '🔄', action: () => this.refresh() });
    return items;
}
```

**菜单项格式**:
```javascript
{ id: 'unique-id', label: '显示文字', icon: 'emoji', destructive: false, action: () => {} }
{ type: 'separator' }  // 分隔线
```

### 2.4 小组件库（Gallery）无变动

WidgetGallery 的预览内容（`_previews` 对象）不依赖 header 结构，无需修改。

---

## 3. 8 个小组件内容重组方案

| Widget | 当前依赖 | 一体化方案 |
|--------|----------|------------|
| 🕐 时间 | 无 header 强依赖 | 内容自描述，render() 无需改动 |
| 🌤️ 天气 | 无 header 强依赖 | 内容自描述 + 可选天气动态渐变背景 |
| 🔗 快捷方式 | 有 `_addHeaderAddBtn` | "+"按钮迁移到右键菜单，网格直接展示 |
| ✅ 待办事项 | 有 `_addHeaderAddBtn` | "+"按钮迁移到右键菜单 `openManager()` |
| 🔖 书签 | 无 header 强依赖 | 内容自描述，纯粹展示网格 |
| 🔥 热榜 | 已有 `hotboard-meta` | 已有 meta 区保持不动 |
| 📊 时间进度 | 无 header 强依赖 | 内容自描述 |
| 📖 每日单词 | 无 header 强依赖 | 单词内容自描述 |

无需改动 render() 内容的 widget：**时钟、热榜、时间进度、每日单词**（4 个）

需要清理 `_addHeaderAddBtn` 调用的 widget：**快捷方式、待办事项**（2 个）

可考虑添加品牌背景的 widget：**天气**（1 个，可选增强）

### 3.1 天气小组件动态背景（可选增强）

iOS 18 标志性设计：根据天气条件驱动卡片渐变背景。
- ☀️ 晴 → 蓝金色渐变 `linear-gradient(135deg, #1a73e8, #0d47a1)`
- ☁️ 阴 → 灰蓝色渐变 `linear-gradient(135deg, #78909C, #37474F)`
- 🌧️ 雨 → 水蓝色渐变 `linear-gradient(135deg, #4FC3F7, #0277BD)`
- 保持文字白色，确保对比度

---

## 4. CSS 样式变更

### 4.1 移除的样式（widgets.css）
- `.widget-header`, `.widget-icon`, `.widget-title` — 头部相关
- `.widget-header-actions`, `.widget-size-btn`, `.widget-delete-btn`, `.widget-header-add-btn` — 操作按钮
- `.widget:hover .widget-size-btn` 等 hover 浮现规则

### 4.2 新增的样式
- `.context-menu` — 上下文菜单容器（浮层）
- `.context-menu-item` — 菜单项
- `.context-menu-separator` — 分隔线
- `.context-menu-item.destructive` — 红色警示项

### 4.3 调整的样式
- `.widget` — 移除 `padding-top` 的额外空间（原为 header 预留）
- `.widget-content` 成为卡片的唯一子元素

---

## 5. 开发者 API 文档

### 交付物
1. **`WIDGET_API.md`** — 完整 API 参考，包含快速开始、生命周期、尺寸系统、上下文菜单自定义
2. **`src/js/widgets/widget-template.js`** — 可复制的开发模板
3. **`WIDGET_STYLE_GUIDE.md`** — CSS 变量体系、动画曲线、断点参考

### 最小开发流程

```javascript
// 1. 继承 Widget
class MyWidget extends Widget {
    // 2. 静态元信息
    static type = 'my-widget';
    static displayName = '我的小组件';
    static defaultSize = 'sm';
    static icon = 'fa-star';
    static maxPerArea = 1;

    // 3. 实现 render()
    render() { /* ... */ }

    // 4. （可选）自定义上下文菜单
    getContextMenuItems() { /* ... */ }
}

// 5. 注册
WidgetFramework.register('my-widget', MyWidget);
```

---

## 6. 应遵循的约束

1. **CSS 变量体系不变** — 主题/颜色继续使用 `var(--ios-blue)` 等 tokens
2. **SortableJS 拖拽不受影响** — 拖拽 handle 调整为 `.widget-content`（移除 `.widget-header`）
3. **Gallery 预览不变** — `_previews` 内容不依赖 header
4. **布局持久化不变** — localStorage 格式不变
5. **Spring 动画系统不变** — 入场/出场/尺寸切换动画保持不变
6. **删除动画保留** — `animateOut()` + `_pendingRemove` 逻辑不变

---

## 7. 未包含项（明确排除的范围）

- 不涉及小组件库 UI 改造
- 不改动设置/管理弹窗
- 不改动搜索、主题切换等其他页面功能
- 不改动布局持久化/迁移逻辑
- 不引入新的数据层抽象
