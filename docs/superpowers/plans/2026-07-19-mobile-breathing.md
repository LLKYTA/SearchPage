# 移动端呼吸感布局实现计划

> **面向 AI 代理的工作者：** 纯 CSS 改动，内联执行即可。

**目标：** 恢复移动端 iOS 18 毛玻璃质感，加大间距和顶部留白，让页面更通透

**架构：** 修改 `widgets.css` 和 `layout.css` 两个文件的 480px/768px 断点，删除对 widget 基类毛玻璃的覆盖

**技术栈：** CSS Custom Properties

---

### 任务 1：修改 480px 断点 — widgets.css

**文件：**
- 修改：`src/css/widgets.css`（`@media (max-width: 480px)` 块）

- [ ] **步骤 1：替换 480px 断点**

将（约第 418 行起）：
```css
@media (max-width: 480px) {
    .widgets-area { grid-template-columns: 1fr; gap: 8px; }
    .shortcuts-grid, .bookmarks-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .widget { padding: 12px; border-radius: var(--radius-dropdown); }
    ...
}
```
改为：
```css
@media (max-width: 480px) {
    .widgets-area { grid-template-columns: 1fr; gap: 16px; }
    .widget-group { margin-bottom: 8px; }
    .widget-group-header { font-size: 12px; padding: 6px 4px 8px; }
    .shortcuts-grid, .bookmarks-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }
    /* 恢复毛玻璃：删除 padding/radius 覆盖，让基类 .widget 生效 */
    .time-display { font-size: 26px; }
    .weather-temp { font-size: 24px; }
    .weather-icon { font-size: 26px; }
    .hotboard-list { max-height: 260px; }
    .hotboard-item { padding: 10px 8px; }
    .hotboard-title { font-size: 14px; }
    /* 触摸目标放大 */
    .bookmark-item { padding: 10px; min-height: 44px; }
    .shortcut-item { min-height: 44px; }
    .todo-item { min-height: 36px; }
    .todo-checkbox { width: 22px; height: 22px; }
}
```

- [ ] **步骤 2：修改 768px 断点**

```css
@media (max-width: 768px) {
    .widgets-area {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
    }
    .widget-group-header { font-size: 12px; padding: 8px 4px 8px; }
    .widget { padding: 18px 22px; border-radius: var(--radius-card); }
    .time-display { font-size: 28px; }
    .date-display { font-size: 12px; }
    .weather-temp { font-size: 24px; }
    .weather-icon { font-size: 28px; }
    .hotboard-list { max-height: 200px; }
    .bookmarks-grid, .shortcuts-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
```

- [ ] **步骤 3：验证 CSS 语法**

确认 480px 断点不再有 `.widget { padding: 12px; border-radius: ... }` 覆盖。

### 任务 2：修改 layout.css — 间距和顶部留白

**文件：**
- 修改：`src/css/layout.css`

- [ ] **步骤 1：修改 480px 断点**

```css
@media (max-width: 480px) {
    .container-main {
        padding: 0 16px 90px;
    }
    .search-hero {
        padding-top: min(20vh, 100px);
        padding-bottom: 28px;
    }
    .search-card {
        border-radius: 18px;
    }
    .search-card-row {
        padding: 6px 6px 6px 18px;
    }
}
```

- [ ] **步骤 2：修改 768px 断点**

```css
@media (max-width: 768px) {
    .container-main {
        padding: 0 20px 100px;
    }
    .search-hero {
        padding-top: min(22vh, 140px);
        padding-bottom: 32px;
    }
}
```

### 任务 3：预览验证 + Commit

- [ ] **步骤 1：验证修改**

```bash
cd d:/github/SearchPage
python3 -m http.server 8080
```
在浏览器打开，切换到 480px 和 768px 宽度确认样式正确。

- [ ] **步骤 2：Commit**

```bash
git add src/css/widgets.css src/css/layout.css
git commit -m "style: iOS 18 breathing layout for mobile

- Increase gap 8px→16px, widget padding 12px→16px 20px at 480px
- Restore glass-card backdrop-filter (remove flat override)
- Enlarge search hero padding-top: min(15vh,80px)→min(20vh,100px)
- Sync 768px breakpoint with larger spacing
- Slightly increase time/weather font sizes to match larger cards

Co-Authored-By: Claude <noreply@anthropic.com>"
```
