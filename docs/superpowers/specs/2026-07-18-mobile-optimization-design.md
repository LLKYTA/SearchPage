# 移动端体验优化设计文档

## 概述

优化 KD起始页的移动端体验，聚焦两个核心方向：长按手势触发上下文菜单，以及单列布局下的内容密度优化。

## 1. 长按打开上下文菜单

### 当前状态
- 桌面端通过 `contextmenu` 事件（鼠标右键）触发 WidgetContextMenu
- 移动端没有任何长按触发机制
- SortableJS 配置了 600ms 拖拽延迟（`delay: 600, delayOnTouchOnly: true, touchStartThreshold: 5`）

### 设计

#### 手势区分策略
采用**位移阈值**区分按住和拖拽：

| 手势 | 触发 | 效果 |
|------|------|------|
| 按住（位移 < 10px，500ms） | 长按菜单 | 打开 WidgetContextMenu |
| 按住 + 移动（位移 > 5px） | 拖拽 | SortableJS 排序 |
| 快速点击 | 无操作 | 默认行为（链接跳转等） |

#### 实现方案

**a) Widget 基类新增 `_initLongPress()`**

在 `createDOM()` 后调用，为元素添加 touch 事件管理：

```
touchstart → 记录起始坐标 → 启动 500ms 定时器
    ↓
touchmove → 计算位移 → 超过 10px → 取消定时器（进入拖拽）
    ↓
500ms 到 → 震动反馈 → 弹出上下文菜单 → 标记 menuOpen
    ↓
touchend → 取消定时器（如果菜单未打开，纯点击）
```

**b) SortableJS `onChoose` 适配**

当 long-press 已打开菜单时，onChoose 回调中跳过拖拽初始化（不添加 `widget-waiting` 类、不震动），让菜单保持打开。用户若继续移动手指触发拖拽，onEnd 中会自动关闭菜单。

**c) 桌面端不变**

`contextmenu` 事件监听保留，互不干扰。

### 交互流程

```
用户长按小组件
    ↓
500ms 后菜单弹出 + 震动反馈
    ↓
用户看到菜单 ─┬── 点击菜单项 → 执行操作 → 菜单关闭
              ├── 点击外部  → 菜单关闭
              └── 继续移动  → 拖拽开始 → 菜单关闭（onEnd 处理）
```

## 2. 单列布局优化

### 当前状态

`_layoutGroupForBreakpoint()` 在 `cols === 1` 时强制所有 widget 为 `sm` 尺寸，导致内容展示非常稀疏。

```javascript
// 当前代码
if (cols === 1) {
    size = 'sm';
}
```

### 改动

将强制 `sm` 改为仅降级 `lg`：

```javascript
if (cols === 1 && size === 'lg') {
    size = 'md';
}
```

这样 `sm` 保持不变，`md` 展示更丰富内容，`lg` 降为 `md`。

### CSS 优化

| 项 | 当前值 | 优化值 |
|----|--------|--------|
| 小组件间距（480px 以下） | 10px | 8px |
| widget padding | 12px 14px | 12px |
| 热榜列表高度 | 200px（768px） | 不变，利用 md 展示更多 |
| 书签/快捷方式网格 | 2 列 | 保持不变 |
| 时间字号 | 28px（768px） | 24px（480px 以下） |

## 变更清单

| 文件 | 改动 |
|------|------|
| `src/js/lib/widget-framework.js` | Widget 基类新增 `_initLongPress()`；`onChoose` 适配菜单态；`_layoutGroupForBreakpoint` 单列允许 md |
| `src/css/widgets.css` | 单列间距、字号、热榜高度优化；触摸目标增强 |
| `src/css/layout.css` | 无改动（已有响应式断点） |

## 自检

- [x] **无占位符** — 所有实现细节已在设计中明确
- [x] **内部一致** — 长按手势与 SortableJS 拖拽通过位移阈值自然区分
- [x] **范围聚焦** — 仅包含长按菜单 + 单列布局优化，无过度设计
- [x] **无模糊需求** — 500ms 长按延迟、10px 位移阈值均已定值
