# 搜索建议重构设计

## 概述

将搜索建议功能从 `app.js` 中抽取为独立的 `SearchSuggestions` 类，同时增强引擎支持、键盘导航、请求中断、缓存策略和 UI 状态反馈。

## 架构

### SearchSuggestions 类

```
SearchSuggestions (src/js/lib/search-suggestions.js)
├── 静态属性: adapters, DEFAULTS
├── 静态方法: registerAdapter(engineId, fn)
├── 实例属性: #inputEl, #overlayEl, #options, #cache, #abortController, #activeIndex
├── 实例方法: bind(), hide(), destroy()
└── 私有方法: #fetch(), #onInput(), #setupKeyboardNav(), #showItems(), #showLoading(), #showError()
```

### 数据流

```
用户输入 → input 事件 (200ms 防抖)
    → query < 2 字符? → hide()
    → #fetch(engineId, query)
        → AbortController 中断上一个请求
        → 检查 TTL 缓存 (2min)
        → 命中 → 直接返回
        → 未命中 → 调用对应 adapter(query, signal)
            → adapter 做 HTTP 请求
            → 写入缓存 → 返回
    → items 为空? → hide() 或 showError()
    → showItems(items, query)
        → 高亮匹配文字
        → 渲染到 overlay 面板
        → 启用键盘导航
```

### 键盘导航

| 按键 | 行为 |
|------|------|
| `↓` | 选中下一个建议项，循环到第一个 |
| `↑` | 选中上一个建议项，回到输入框 |
| `Enter` | 确认当前选中的建议项（如果有） |
| `Escape` | 关闭面板，输入框失焦 |

### 缓存策略

- 内存缓存，key 格式 `"engineId:query"`
- TTL 120s
- 调用 `destroy()` 时清空

### UI 状态

| 状态 | 显示 |
|------|------|
| 加载中 | spinner + "正在获取建议…" |
| 成功 | 建议列表，高亮匹配 |
| 空结果 | "暂无建议" |
| 错误 | 错误提示，可点击重试 |

### 引擎适配器

| 引擎 | 状态 | API |
|------|------|------|
| 百度 | ✅ | `suggestion.baidu.com/s?wd=` (JSONP兼容) |
| Google | ✅ | `suggestqueries.google.com/complete/search` |
| Bing | ⏳ 暂空 | 待调研稳定接口 |
| 搜狗 | ⏳ 暂空 | 待调研 |
| 其他 | ⏳ 暂空 | 待调研 |

适配器返回 `string[]` 或抛出异常。未注册的引擎返回 `[]`。

### 集成

- 文件 `src/js/lib/search-suggestions.js`
- 在 `index.html` 中 `uapi.js` 之后、`app.js` 之前引入
- 引擎适配器在加载时通过 `SearchSuggestions.registerAdapter()` 注册
- `app.js` 中的 `initSearchSuggestions()` 简化为实例化 `SearchSuggestions`
- 删除 `app.js` 中的 `getSuggestions()`, `showSuggestions()`, `SUGGESTION_CACHE`, `suggestTimer` 等函数/变量
- 设置页的 `search-suggestions-enabled` 开关保持兼容

### 文件变更清单

| 文件 | 操作 |
|------|------|
| `src/js/lib/search-suggestions.js` | **新建** — SearchSuggestions 类 |
| `index.html` | 添加 `<script>` 加载新文件 |
| `src/js/app/app.js` | 删除旧建议代码，用 `new SearchSuggestions` 替换 |
| `src/css/layout.css` | 可能微调加载/错误状态的样式 |

### 测试点

1. 输入 `ab` → 触发建议请求
2. 快速输入 `abcdef` → 前一个请求被中断，只有最后请求生效
3. 按 ↓ 选中建议项，Enter 触发搜索
4. 按 Esc 关闭面板
5. 设置页关闭"搜索建议" → 不再发起请求
6. 网络断开 → 显示错误提示
7. 同一查询2分钟内重复 → 走缓存无网络请求
8. `destroy()` 后绑定事件全部解除
