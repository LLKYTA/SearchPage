# KD起始页 ✨
> iOS风格简约美观的浏览器主页 | 小组件框架 · 拖拽排序 · 多搜索引擎

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/)
[![CSS3](https://img.shields.io/badge/CSS3-Grid-blue.svg)](https://developer.mozilla.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#贡献)

---

## 📸 预览
![KD起始页预览](https://via.placeholder.com/1200x600/007AFF/ffffff?text=KD+StartPage)

**✨ 核心特性：毛玻璃效果 · 渐变背景 · 拖拽排序 · 尺寸切换 · 热榜多源**

---

## 🚀 功能特性

### 🎨 视觉设计
- **iOS风格设计** - 标准圆角、毛玻璃(Glassmorphism)效果、柔和阴影
- **动态渐变背景** - 流动渐变色 + 浮动气泡装饰动画
- **深色模式** - 浅色 / 深色 / 自动跟随系统，一键切换
- **流畅动画** - 所有交互过渡自然、丝滑

### 🔍 搜索功能
- **多引擎切换** - 百度、Google、Bing 一键切换，偏好自动记忆
- **回车即搜** - 输入关键词回车或点击按钮搜索
- **引擎标识** - 当前搜索引擎清晰展示

### 🧩 小组件系统（基于可扩展框架）
- **⏰ 时间日期** - 实时数字时钟 + 农历/星期显示
- **🌤️ 实时天气** - 基于IP自动定位，显示温度、天气和城市
- **⚡ 快捷方式** - 自定义图标、颜色、链接，常用网站一键直达
- **✅ 待办事项** - 本地存储，支持勾选完成和批量管理
- **🔖 常用书签** - 可增删改的书签卡片
- **🤖 AI工具入口** - 快速访问 AI 平台
- **🔥 热榜聚合** - 支持微博、知乎、B站、百度、抖音、头条、36氪、虎扑等多源实时热搜，下拉切换来源

### ✋ 拖拽排序与尺寸切换
- **自由拖拽** - 长按/按住小组件头部任意调整顺序（基于SortableJS）
- **三种尺寸** - 每个小组件可独立切换小/中/大尺寸，布局自动调整
- **持久化记忆** - 所有位置、尺寸、内容自动保存至浏览器，刷新不丢失

### 📱 响应式布局
- 📱 手机端 - 自适应单列排版
- 📱 平板端 - 2列网格
- 💻 桌面端 - 多列自适应网格，充分利用宽屏

---

## 🚀 快速开始

### 方式一：开箱即用
1. 下载或克隆本项目
2. 直接用浏览器打开 `index.html`
3. 设为浏览器主页即可

### 方式二：本地服务器预览
```bash
# 克隆项目
git clone https://github.com/yourname/kd-startpage.git

# 进入目录
cd kd-startpage

# 使用任意HTTP服务器启动（例如Python）
python3 -m http.server 8080

# 然后访问 http://localhost:8080
```

---

## 📁 项目结构

```
kd-startpage/
├── index.html                      # 主页面入口
├── README.md                       # 项目说明
├── main/
│   ├── css/
│   │   ├── variables.css           # 设计变量（颜色、圆角、阴影…）
│   │   ├── layout.css              # 页面骨架（顶栏、搜索区、响应式）
│   │   ├── widgets.css             # 所有小组件卡片与拖拽样式
│   │   └── dialogs.css             # 弹窗、设置面板、启动动画
│   └── js/
│       ├── lib/
│       │   ├── widget-framework.js # 小组件框架核心（注册、区域、拖拽）
│       │   └── uapi.js             # 天气 / 热榜 / 每日单词 API
│       ├── widgets/                # 每个小组件独立文件，互不干扰
│       │   ├── clock.js            #   实时数字时钟
│       │   ├── weather.js          #   天气显示
│       │   ├── todo.js             #   待办事项
│       │   ├── bookmarks.js        #   常用书签
│       │   ├── shortcuts.js        #   快捷方式
│       │   ├── ai-tools.js         #   AI 工具入口
│       │   ├── hotboard.js         #   多源热榜
│       │   ├── time-progress.js    #   时间进度条
│       │   └── daily-word.js       #   每日单词
│       └── app/                    # 按职责拆分的应用逻辑
│           ├── app.js              #   应用入口（初始化、搜索、主题、组件注册）
│           ├── preferences.js      #   设置面板（偏好、热榜来源、词库）
│           └── admin.js            #   管理弹窗（CRUD、关于、全局快捷键）
```

---

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| **HTML5** | 语义化结构，原生属性 |
| **CSS3** | CSS变量、Grid布局、`backdrop-filter` 毛玻璃、动画 |
| **JavaScript (ES6+)** | 面向对象设计，框架无依赖 |
| **SortableJS** | 拖拽排序库（轻量、触摸友好） |
| **UAPI** | 提供天气、热榜数据 |
| **LocalStorage** | 所有数据本地持久化 |
| **Font Awesome** | 图标库 |

> ✅ **极低依赖** - 除了拖拽库和图标库，核心逻辑零框架

---

## ⚙️ 配置与自定义

### 新增小组件
1. 在 `main/js/widgets/` 中创建类文件，继承 `Widget`，实现 `render()` 方法
2. 在 `main/js/app/app.js` 中注册：`WidgetFramework.register('my-type', MyWidget);`
3. 通过页面上的 `+` 按钮即可添加到桌面

### 修改默认布局
编辑 `index.html` 中 `data-default-widgets` 属性，调整初始小组件类型和顺序。

### 更换默认搜索引擎
在 `main/js/app/app.js` 的 `CONFIG.searchEngines` 中添加或修改。

### 自定义主题色
编辑 `main/css/variables.css` 中的 CSS 变量，例如 `--ios-blue`。

### 修改小组件样式
每个小组件的样式都在 `main/css/widgets.css` 中，按类名查找修改。

---

## 🎯 浏览器支持

| ![Chrome](https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png) | ![Firefox](https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png) | ![Safari](https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png) | ![Edge](https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png) |
| :---: | :---: | :---: | :---: |
| ✅ 最新版 | ✅ 最新版 | ✅ 最新版 | ✅ 最新版 |

> ⚠️ 毛玻璃效果需要浏览器支持 `backdrop-filter`，不支持的浏览器会降级为半透明背景。

---

## 🗺️ 开发计划

- [x] 小组件框架 + 拖拽排序
- [x] 天气实时获取
- [x] 多源热榜
- [x] 待办事项管理
- [ ] 自定义背景图片上传
- [ ] 更多小组件（便签、倒计时、RSS阅读器等）
- [ ] 小组件市场/插件系统
- [ ] 数据云端同步
- [ ] 多语言国际化

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 💖 致谢

- 设计灵感：Apple iOS 小组件系统
- 图标：[Font Awesome](https://fontawesome.com/)
- 数据接口：[UAPI](https://uapis.cn/)
- 拖拽交互：[SortableJS](https://sortablejs.com/)

---

**如果觉得好用，别忘了给个 ⭐ Star 支持一下！**

Made with ❤️ by KD
