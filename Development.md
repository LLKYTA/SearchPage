# KD起始页 - 小组件系统文档

## 概述

KD起始页的小组件系统是一个**轻量、可扩展的桌面组件框架**，灵感来自 iOS 主屏幕小组件。开发者只需关注组件内容逻辑，框架自动处理布局、拖拽排序、尺寸切换和状态持久化。

---

## 项目文件结构

```
main/
├── css/
│   ├── variables.css       ← 设计变量（颜色、圆角、阴影…）
│   ├── layout.css          ← 页面骨架（顶栏、搜索区、响应式）
│   ├── widgets.css         ← 小组件卡片与拖拽样式
│   └── dialogs.css         ← 弹窗、设置面板、启动动画
│
└── js/
    ├── lib/                                ← 基础设施（不常改动）
    │   ├── widget-framework.js             ← 框架核心：注册、区域、拖拽
    │   └── uapi.js                         ← API 层：天气、热榜、每日单词
    │
    ├── widgets/                            ← 每个小组件独立文件
    │   ├── clock.js                        ← 实时数字时钟
    │   ├── weather.js                      ← 天气显示
    │   ├── todo.js                         ← 待办事项
    │   ├── bookmarks.js                    ← 常用书签
    │   ├── shortcuts.js                    ← 快捷方式
    │   ├── ai-tools.js                     ← AI 工具入口
    │   ├── hotboard.js                     ← 多源热榜
    │   ├── time-progress.js                ← 时间进度条
    │   └── daily-word.js                   ← 每日单词
    │
    └── app/                                ← 应用逻辑（按职责拆分）
        ├── app.js                          ← 入口：初始化、搜索、主题、组件注册
        ├── preferences.js                  ← 设置面板：偏好、热榜来源、词库
        └── admin.js                        ← 管理弹窗：CRUD、关于、全局快捷键
```

**新增/修改一个功能时，你知道去哪找：**
| 想做什么 | 打开哪个文件 |
|----------|-------------|
| 新加一个小组件 | `widgets/` 新建文件 + `app/app.js` 加一行注册 |
| 改某个小组件的逻辑 | `widgets/` 下对应的文件 |
| 改小组件的外观 | `css/widgets.css` |
| 改搜索/主题行为 | `app/app.js` |
| 改设置面板 | `app/preferences.js` |
| 改数据管理弹窗 | `app/admin.js` |

---

## 核心设计

### 三层架构

```
┌─────────────────────────────────┐
│        WidgetFramework          │  ← 全局注册中心、布局持久化、小组件库
├─────────────────────────────────┤
│          WidgetArea             │  ← 区域容器，管理该区域内的组件列表
├─────────────────────────────────┤
│    Widget (Clock, Weather...)   │  ← 具体组件实现，纯业务逻辑
└─────────────────────────────────┘
```

### 关键类

| 类名 | 职责 |
|------|------|
| `WidgetFramework` | 全局单例，管理注册、区域查找、布局存储与加载、小组件库弹窗 |
| `Widget` | 抽象基类，定义组件生命周期、DOM骨架创建、尺寸切换 |
| `WidgetArea` | 区域实例，负责渲染该区域内的组件列表、处理拖拽排序、增删组件 |
| 具体组件类 (ClockWidget等) | 继承 `Widget`，实现 `render()` 填充内容 |

---

## 生命周期

1. **注册** → 在 `app.js` 中调用 `WidgetFramework.register(type, Class)`
2. **布局加载** → 框架从 `localStorage` 读取布局数据，若不存在则使用 HTML 中的 `data-default-widgets` 默认配置
3. **实例化** → 根据布局创建组件实例，调用 `createDOM()` 生成骨架
4. **渲染** → 调用 `render()` 填充小组件内容
5. **交互** → 用户可拖拽排序、切换尺寸、删除
6. **销毁** → 调用 `destroy()` 清理资源（定时器等）

---

## 如何开发一个小组件

### 1. 创建组件文件

在 `widgets/` 目录下新建文件，创建一个继承 `Widget` 的类：

```javascript
// widgets/hello.js
class HelloWidget extends Widget {
    // 静态属性：必须定义
    static type = 'hello';           // 唯一标识
    static displayName = '问候语';    // 在小组件库中显示的名称
    static defaultSize = 'sm';       // 默认尺寸：sm / md / lg
    static icon = 'fa-smile-o';      // FontAwesome 图标类
    static maxPerArea = 3;           // 可选：该区域最多实例数，默认无限

    // 核心方法：渲染内容到 this.element 内部的 .widget-content
    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = `<p>Hello, World!</p>`;
    }

    // 可选：当组件需要刷新时调用（如天气定时更新）
    onUpdate() {
        console.log('hello updated');
    }

    // 可选：打开管理弹窗（如待办列表管理）
    openManager() {
        // 自定义管理逻辑
    }

    // 如果使用了定时器或事件监听，务必重写 destroy 清理
    destroy() {
        clearInterval(this.timer);
        super.destroy();
    }
}
```

### 2. 注册组件

在 `app/app.js` 中的注册区域添加一行：

```javascript
// app/app.js
WidgetFramework.register('hello', HelloWidget);
```

### 3. 添加到桌面

- **方式一**：在 `index.html` 的 `data-default-widgets` JSON 中添加 `{"type":"hello"}`
- **方式二**：页面加载后，点击 `+` 按钮打开小组件库，点击卡片即可添加

组件会立即渲染在指定区域。

### 4. 非 JS 修改：为组件添加样式

在 `css/widgets.css` 中添加对应样式，按组件类名前缀命名：

```css
/* widgets.css */
.hello-greeting { font-size: 18px; color: var(--text-primary); }
```

### 5. 在 `index.html` 中添加引用

```html
<!-- 小组件 -->
<script src="./main/js/widgets/hello.js"></script>
```

---

## Widget 基类 API

### 静态属性（子类必须覆盖）

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `string` | 组件唯一标识，用于布局存储 |
| `displayName` | `string` | 在小组件库中的显示名称 |
| `defaultSize` | `'sm' | 'md' | 'lg'` | 默认尺寸 |
| `icon` | `string` | FontAwesome 4 图标类，如 `'fa-clock-o'` |
| `maxPerArea` | `number` (可选) | 该区域最多允许的实例数，默认 `Infinity` |

### 实例属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `this.container` | `HTMLElement` | 所属区域 DOM 容器 |
| `this.index` | `number` | 当前在区域内的索引 |
| `this.element` | `HTMLElement` | 组件根元素（.widget） |

### 实例方法

| 方法 | 说明 |
|------|------|
| `createDOM()` | 框架调用，生成 `.widget` 骨架（含头部操作按钮），子类**无需覆盖** |
| `render()` | **必须实现**，填充 `.widget-content` 内部内容 |
| `onUpdate()` | 数据更新回调（如天气刷新） |
| `openManager()` | 可选，打开管理弹窗 |
| `destroy()` | 清理资源（定时器、监听器），重写时记得调用 `super.destroy()` |
| `cycleSize()` | 框架调用，切换 sm/md/lg |

---

## 内置小组件列表

| 组件 | type | 文件 | 说明 |
|------|------|------|------|
| `ClockWidget` | `clock` | `widgets/clock.js` | 实时数字时钟 |
| `WeatherWidget` | `weather` | `widgets/weather.js` | 天气显示（UAPI） |
| `TodoWidget` | `todo` | `widgets/todo.js` | 待办事项列表 |
| `BookmarksWidget` | `bookmarks` | `widgets/bookmarks.js` | 常用书签 |
| `AiToolsWidget` | `ai-tools` | `widgets/ai-tools.js` | AI 工具入口 |
| `ShortcutsWidget` | `shortcuts` | `widgets/shortcuts.js` | 自定义快捷方式 |
| `HotboardWidget` | `hotboard` | `widgets/hotboard.js` | 多源实时热榜 |
| `TimeProgressWidget` | `time-progress` | `widgets/time-progress.js` | 时间进度条 |
| `DailyWordWidget` | `daily-word` | `widgets/daily-word.js` | 每日单词 |

---

## 布局与持久化

所有组件的**位置顺序、尺寸**都保存在 `localStorage` 的 `widgets-layout` 键下，结构如下：

```json
{
  "main-area": [
    { "type": "clock", "size": "sm", "config": {} },
    { "type": "weather", "size": "md", "config": {} }
  ]
}
```

- 页面加载时框架读取该布局并渲染
- 拖拽排序、增删组件、切换尺寸时会自动保存
- 若 `localStorage` 无数据，使用 HTML 中 `data-default-widgets` 定义的默认布局

---

## 尺寸系统

每个组件支持三种尺寸，通过头部操作按钮切换。

| 尺寸 | CSS 类 | 网格占位（桌面端） |
|------|--------|-------------------|
| 小 | `widget-sm` | 1 列 × 1 行 |
| 中 | `widget-md` | 2 列 × 1 行 |
| 大 | `widget-lg` | 3 列 × 2 行 |

实际表现受区域网格容器 `grid-template-columns` 影响，移动端通常只占 1 列，所以尺寸变化不明显。

开发者可根据 `widget-sm/md/lg` 类名在 `css/widgets.css` 中定制不同尺寸的布局细节。

---

## 拖拽排序

基于 **SortableJS** 实现，配置如下：

- **手柄**：`.widget-header`（只能拖拽头部）
- **过滤**：`.widget-size-btn` 和 `.widget-delete-btn` 不触发拖拽
- **长按延迟**：触屏设备 500ms 后才触发，防止滑动误触
- **动画**：200ms 平滑过渡
- **排序完成**：自动保存新布局

如需调整拖拽行为，修改 `lib/widget-framework.js` 中 `_enableDragDrop` 方法的 `Sortable` 配置即可。

---

## 添加新区域

默认只有一个 `main-area`，如需多个独立区域：

1. 在 HTML 中添加 `<div data-widget-area="area2" data-default-widgets='[...]'></div>`
2. 为该区域添加添加按钮：`onclick="WidgetFramework.openGallery('area2')"`
3. 框架会自动初始化该区域

不同区域的布局独立保存，互不影响。

---

## 常见问题

**Q: 如何让组件显示在不同区域？**  
A: 通过小组件库的 `+` 按钮添加时，目标区域由触发按钮的 `areaId` 参数决定。可以在不同区域旁边放置不同的添加按钮。

**Q: 如何限制组件只能添加一个实例？**  
A: 设置 `static maxPerArea = 1`，再次添加时会弹出提示。

**Q: 如何让组件数据支持导出/导入？**  
A: 每个组件自行管理其数据（如 `localStorage` 中的 `todos`），框架只负责布局。可实现自定义的导入导出逻辑。

**Q: 如何禁用拖拽？**  
A: 在 `_enableDragDrop` 方法中不初始化 `Sortable`，或注释掉调用。

**Q: 为什么文件变多了？**  
A: 优化后从 4 个 JS 文件拆分为 14 个，每个文件只做一件事，修改时互不影响，查找更快捷——总代码量不变。

---

## 进阶扩展建议

- **组件通信**：可通过 `WidgetFramework` 提供的事件总线或直接调用 `onUpdate`
- **自定义骨架**：重写 `createDOM()` 可完全自定义组件头部（但通常不建议，保持视觉统一）
- **异步渲染**：`render()` 支持 `async`，用于数据获取
- **右键菜单**：可通过监听 `contextmenu` 事件在组件上添加右键菜单

---

## 总结

KD起始页小组件系统提供了接近 iOS 原生小组件体验的 Web 实现，支持拖拽、尺寸切换和持久化。代码结构按职责分层：

- `lib/` → 基础设施，一般不修改
- `widgets/` → 单个小组件，新增/修改最频繁
- `app/` → 应用级逻辑

开发者只需关注 `render()` 内的业务逻辑，即可快速开发新组件。
