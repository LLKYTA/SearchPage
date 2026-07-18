# 移动端呼吸感布局设计文档

## 背景

上一轮移动端优化（单列布局 + 长按菜单）采用了较紧凑的间距，用户反馈页面显得"太满"，缺少 iOS 18 的"呼吸感"。本轮设计恢复 iOS 18 毛玻璃卡片的通透、留白和视觉层次。

## 核心改动

### 1. 480px 以下单列布局 — 加大间距 + 恢复玻璃质感

| CSS 属性 | 当前值（紧凑） | 新值（呼吸感） |
|----------|--------------|--------------|
| `widgets-area gap` | 8px | **16px** |
| `widget padding` | 12px | **16px 20px** |
| `widget border-radius` | `--radius-dropdown` (14px) | **`--radius-card` (18px)** |
| `widget background` | 被覆盖为扁平 | **恢复毛玻璃**（删除覆盖，使用基类 .widget 的 glass vars） |
| `widget margin-bottom` | 0 | **4px**（组内卡片微呼吸） |
| `.shortcuts-grid gap` | 8px | **12px** |
| `.bookmarks-grid gap` | 8px | **12px** |
| `container-main padding` | 0 12px | **0 16px** |
| `search-hero padding-bottom` | 20px | **28px** |
| `search-card-row padding` | 4px 4px 4px 14px | **6px 6px 6px 18px** |
| `search-card border-radius` | 14px | **18px** |

### 2. 768px 断点（平板以下）— 同步呼吸感

| CSS 属性 | 当前值 | 新值 |
|----------|--------|------|
| `widgets-area gap` | 12px | **16px** |
| `widget padding` | 14px 16px | **18px 22px** |
| `container-main padding` | 0 16px | **0 20px** |
| `search-hero padding-bottom` | 24px | **32px** |

### 3. Widget 基础类取消紧凑覆盖

当前的 480px 断点对 `.widget` 设置了 `padding: 12px; border-radius: var(--radius-dropdown)`，这覆盖了基类的毛玻璃效果。需要删除该覆盖，让 widget 恢复基类定义的毛玻璃样式。

### 4. 字体层次微调

移动端保持清晰可读，略微放大以匹配更大的卡片：

| 属性 | 当前 480px | 新值 |
|------|-----------|------|
| `time-display` | 24px | **26px** |
| `weather-temp` | 22px | **24px** |
| `weather-icon` | 24px | **26px** |
| `hotboard-title` | 13px | **14px** |

### 5. 搜索框上方留白加大

| 断点 | 当前 `padding-top` | 新值 |
|------|-------------------|------|
| 480px | `min(15vh, 80px)` | **`min(20vh, 100px)`** |
| 768px | `min(18vh, 120px)` | **`min(22vh, 140px)`** |

让搜索卡片在视觉上更下沉，页面上半部分更加通透。

### 6. 分组标题与卡片间距

| 属性 | 当前 480px | 新值 |
|------|-----------|------|
| `widget-group-header padding-bottom` | 4px | **8px** |
| `widget-group-header font-size` | 10px | **12px** |
| `widget-group margin-bottom` | 4px | **8px** |

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/css/widgets.css` | 480px 和 768px 断点的 gap/padding/radius 调整 |
| `src/css/layout.css` | container-main padding、search-hero padding-top/padding-bottom |
| `src/css/variables.css` | 无需改动（glass 变量已定义，恢复使用即可） |

## 无改动部分

- 搜索区顶部留白（`padding-top`）保持不动
- 上下文菜单样式不动
- JS 逻辑不动
- touch 目标 ≥44px 保持不动
- 桌面端布局完全不动

## 自检

- [x] **无占位符** — 所有值已定
- [x] **内部一致** — 480px 和 768px 断点同步加大，无矛盾
- [x] **范围聚焦** — 仅改间距/质感，不引入新功能
- [x] **无模糊需求** — 每个大小的具体像素值均已列出
