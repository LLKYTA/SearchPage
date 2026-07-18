# KD起始页 iOS 18 Redesign · 设计规格

> 版本: 0.11.1 → 0.12.0
> 日期: 2026-07-18

## 概述

对 KD 起始页进行全面视觉升级，核心变化：
1. **壁纸系统** — 引入 Bing 每日一图作为背景，配合模糊与色调叠加层
2. **控制中心式 Widget 布局** — 带分组标题的小组件区域，每组独立区域
3. **材质升级** — 更真实的毛玻璃效果，适配壁纸背景的透明玻璃卡片
4. **暗色模式适配** — 壁纸自动暗化

## 1. 壁纸系统

### 1.1 架构层级 (从底到顶)

```
L0: 壁纸层 (Bing 每日一图 / 预设 / 本地上传)
L1: 模糊层 (backdrop-filter: blur(Npx))
L2: 色调叠加层 (rgba 半透明覆盖)
L3 (暗色模式): 额外深色叠加层 rgba(0,0,0,0.25)
---
内容层 (z-index 最高):
  搜索卡片: 高透明度毛玻璃 (bg: rgba(255,255,255,0.15), blur: 40px)
  Widget 卡片: 中透明度毛玻璃 (bg: rgba(255,255,255,0.12), blur: 30px)
  浮动底栏: 半透明毛玻璃 (bg: rgba(255,255,255,0.72), blur: 40px)
```

### 1.2 壁纸来源

- **Bing 每日一图** (主推，默认启用)
  - 调用 `https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`
  - 获取今日壁纸 URL，缓存到 localStorage
  - 每天首次加载时检查更新
- **预设壁纸库** (备选)
  - 内置 6-8 张精选渐变色/纹理
  - 用于无网络或 Bing API 不可用时兜底
- **本地上传** (备选)
  - File input → FileReader → base64 → localStorage/IndexedDB

### 1.3 模糊与色调控制

存储在 localStorage 中，键 `wallpaper-config`:

```json
{
  "source": "bing",
  "blur": 24,
  "tintColor": "rgba(0,0,0,0.15)",
  "customImage": null
}
```

- **模糊强度**: 0-40px，默认 24px
- **色调颜色**: 预设 6 色 + 自定义色
- **色调不透明度**: 与颜色一同存储

### 1.4 暗色模式

暗色模式下，在 L2 之上额外叠加 `rgba(0,0,0,0.25)` 层，使壁纸变暗。
搜索与 widget 卡片材质从透明白玻璃切换为深色半透明玻璃。

### 1.5 壁纸设置 UI

设置在 `settings-modal` 中的二级导航页"背景"内：

- 顶部: 当前壁纸缩略图预览（实时毛玻璃效果）
- 壁纸来源: 分段选择器 (Bing / 预设 / 上传)
- 模糊: 滑块 0-40px
- 色调: 颜色圆点选择 + 自定义
- 暗色预览: 切换开关

## 2. 控制中心式 Widget 布局

### 2.1 分组结构

Widget 区域不再是从上到下平铺，而是按类型分为组，每组有 section 标题：

```
┌─────────────────────────────┐
│ 🛠️ 常用工具                  │
│ ┌─────────┐ ┌─────────┐    │
│ │ 时钟    │ │ 天气    │    │
│ └─────────┘ └─────────┘    │
│                             │
│ 📋 任务                     │
│ ┌─────────────────────┐    │
│ │ 待办列表...          │    │
│ └─────────────────────┘    │
│                             │
│ 📰 资讯                     │
│ ┌─────────┐ ┌─────────┐    │
│ │ 热榜    │ │ 每日单词 │    │
│ └─────────┘ └─────────┘    │
└─────────────────────────────┘
```

### 2.2 分组规则

| 分组 | Widget 类型 | 图标 |
|------|-------------|------|
| 🛠️ 常用工具 | clock, weather, time-progress | 锤子 |
| 📋 任务 | todo, bookmarks |  clipboard |
| 🔗 快捷 | shortcuts |  link |
| 📰 资讯 | hotboard, daily-word |  newspaper |

### 2.3 存储格式变更

`widgets-layout` 不再只是扁平数组，改为：

```json
{
  "_version": 3,
  "main-area": {
    "groups": [
      {
        "id": "tools",
        "title": "常用工具",
        "icon": "fa-wrench",
        "widgets": [
          {"type": "clock", "size": "sm", "config": {}},
          {"type": "weather", "size": "sm", "config": {}}
        ]
      },
      {
        "id": "tasks",
        "title": "任务",
        "icon": "fa-clipboard",
        "widgets": [
          {"type": "todo", "size": "sm", "config": {}}
        ]
      }
    ]
  }
}
```

位置计算: 在每个 group 内部使用 GridTracker 计算网格位置。
加载时迁移旧 layout 到新格式（v2 → v3）。

### 2.4 拖拽排序

- 组内拖拽: SortableJS 组内排序
- 跨组移动: 长按上下文菜单 → "移动到组" → 选择目标组
- 组顺序: 固定（常用工具 > 任务 > 快捷 > 资讯），不开放自定义

## 3. 材质升级

### 3.1 新的 CSS 变量

```css
/* 毛玻璃卡片（壁纸模式） */
--glass-card-bg: rgba(255, 255, 255, 0.12);
--glass-card-border: rgba(255, 255, 255, 0.08);
--glass-card-blur: 30px;
--glass-card-hover-bg: rgba(255, 255, 255, 0.18);

/* 搜索卡片（更高透明度） */
--glass-search-bg: rgba(255, 255, 255, 0.15);
--glass-search-blur: 40px;

/* 暗色毛玻璃 */
--dark-glass-card-bg: rgba(40, 42, 54, 0.65);
--dark-glass-card-border: rgba(255, 255, 255, 0.06);

/* 色调层 */
--tint-overlay: rgba(0, 0, 0, 0.12);
--dark-tint-overlay: rgba(0, 0, 0, 0.25);
```

### 3.2 动画升级

- 分组 section 标题入场: 从左侧淡入滑入 (slide from left + fade)
- Widget 入场: 保持现有 spring bounce
- 壁纸切换: 交叉淡入 (cross-fade) 300ms
- 模糊变化: CSS transition 0.5s

### 3.3 阴影体系

- 默认: `0 4px 20px rgba(0,0,0,0.06)`
- Hover: `0 8px 32px rgba(0,0,0,0.10)`
- 拖拽: `0 20px 50px rgba(0,0,0,0.15)`

## 4. 响应式

### 4.1 断点

| 断点 | 列数 | 分组显示 |
|------|------|---------|
| > 768px | 3列 | 完整分组 |
| 481-768px | 2列 | 分组标题折叠 |
| ≤ 480px | 1列 | 分组标题折叠，隐藏图标 |

### 4.2 移动端适配

- 分组标题触摸展开/折叠
- 壁纸设置简化为底部 sheet
- 模糊和色调滑块适配触摸

## 5. 实施步骤

### Phase 1: 壁纸系统核心
1. 添加 `lib/wallpaper.js` — Bing API 调用、缓存、baseCSS 生成
2. 修改 `layout.css` — 壁纸层级结构
3. 修改 `preferences.js` — 背景设置页面
4. 修改 `app.js` — 初始化壁纸系统

### Phase 2: 材质升级
1. 更新 `variables.css` — 新增材质变量
2. 更新 `widgets.css` — 卡片毛玻璃化
3. 更新 `layout.css` — 搜索卡片毛玻璃化
4. 更新 `dialogs.css` — 弹窗毛玻璃适配

### Phase 3: 控制中心布局
1. 修改 `widget-framework.js` — 分组存储、GridTracker 改进
2. 修改 `widgets.css` — 分组标题样式
3. 迁移布局数据 (v2 → v3)

## 6. 兼容性

- 旧布局自动迁移: v2 (扁平) → v3 (分组)
- 所有 widget 数据类型不变，`render()` 接口不变
- 第三方 widget 默认归入"其他"组
- 降级: 无壁纸时 fallback 到纯色背景
