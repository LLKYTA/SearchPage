# Task 3 Report: 添加壁纸背景层 CSS

## 实现内容

在 `src/css/layout.css` 中新增了壁纸背景系统 CSS，在装饰元素与主容器之间插入，共 56 行。

### 新增的选择器

| 选择器 | 作用 | 关键属性 |
|--------|------|----------|
| `#wallpaper-layers` | 全屏固定容器 | `position:fixed; inset:0; z-index:0; pointer-events:none` |
| `.wp-layer` | 通用层级基类 | `position:absolute; inset:0` |
| `.wp-image` | 图片/渐变背景层 | `background-size:cover; background-position:center` |
| `.wp-blur` | 毛玻璃模糊层 | `backdrop-filter:blur(24px)` + `-webkit-` 前缀 |
| `.wp-tint` | 色调覆盖层 | `background:var(--tint-overlay); transition` |
| `.dark .wp-tint` | 暗色色调覆盖 | `background:var(--dark-tint-overlay)` |
| `.wp-dark` | 暗色加深层 | `background:rgba(0,0,0,0); transition` |
| `.dark .wp-dark` | 暗色模式加深 | `background:rgba(0,0,0,0.25)` |

### 与 wallpaper.js 的协作

- `.wp-layer` 的 `position:absolute; inset:0` 是 JS 未设置的唯一关键属性，确保所有层级填满容器
- `.wp-image` 的 cover/center/no-repeat 提供默认图片布局（JS 也设置相同值，CSS 作为样式层保障）
- `.wp-blur` 的 `24px` 默认值与 `WALLPAPER_DEFAULT_CONFIG.blur` 一致，JS 动态覆盖
- `.wp-tint` 的背景使用 `var(--tint-overlay)` 变量，与 `variables.css` 定义联动
- `.wp-dark` 的过渡值与 JS 设置的 inline `transition` 一致，CSS 提供暗色默认值作为 JS 失效时的降级

### CSS 变量引用

引用了 `variables.css` 中预定义的：
- `--tint-overlay: rgba(0, 0, 0, 0.12)`
- `--dark-tint-overlay: rgba(0, 0, 0, 0.25)`

### 正确性验证

- CSS 花括号/圆括号平衡检查：311 开 / 311 闭，完全平衡
- 无构建步骤，无预处理器依赖，纯原生 CSS
- 与 wallpaper.js 的 `_renderLayers()` 方法生成的选择器完全对齐

## 修改文件

- `src/css/layout.css` — 新增 56 行壁纸层级样式（位置：装饰元素之后、主容器之前）

## 提交信息

- 分支：`worktree-ios18-redesign`
- 提交：`8a48bfa`
- 消息：`feat(css): add wallpaper background layer styles`

---

## Review Fix (2026-07-18)

### CSS 背景层清理与 fallback 增强

**问题 1：移除旧背景 CSS**
删除了已废弃的 50 行旧样式，这些样式与新壁纸系统功能重叠：
- `.bg-gradient` / `.dark .bg-gradient` — 渐变背景
- `@keyframes gradientShift` — 渐变动画（旧版）
- `.bg-decoration` — 装饰容器
- `.bg-bubble` / `.bg-bubble-1/2/3` — 浮动气泡
- `@keyframes float` — 气泡动画

**问题 2：添加 `body:not(.wallpaper-ready)` fallback**
在 `.wp-dark` 之后添加了 23 行备用背景规则：
- `body.wallpaper-ready #wallpaper-layers` — 就绪后显示壁纸层
- `body:not(.wallpaper-ready)` — 加载失败 / 未设置时的渐变背景（浅色+暗色模式）
- `@keyframes gradientShift` — 重新引入轻量版渐变漂移动画（仅用于 fallback）

### 修改文件

- `src/css/layout.css` — 删除 50 行旧样式，新增 23 行 fallback 规则

### 提交信息

- 提交：`a2627b7`
