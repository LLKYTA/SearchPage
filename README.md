 # KD起始页 ✨
 > iOS风格简约美观的浏览器主页 | 支持拖拽、主题切换、多搜索引擎
 [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
 [![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/)
 [![CSS3](https://img.shields.io/badge/CSS3-Grid-blue.svg)](https://developer.mozilla.org/)
 [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#贡献)
 ---
 ## 📸 预览
 ![KD起始页预览](https://via.placeholder.com/1200x600/007AFF/ffffff?text=KD+StartPage)
 **✨ 核心特性：毛玻璃效果 · 渐变背景 · 流畅动画 · 响应式布局**
 ---
 ## 🚀 功能特性
 ### 🎨 视觉设计
 - **iOS风格设计** - 标准iOS圆角、毛玻璃(Glassmorphism)效果
 - **渐变背景** - 动态渐变背景 + 浮动气泡动画
 - **深色模式** - 支持浅色/深色/自动跟随系统三种模式
 - **流畅动画** - 所有交互都有丝滑过渡动画
 ### 🔍 搜索功能
 - **多搜索引擎** - 支持百度、Google、Bing一键切换
 - **快捷搜索** - 回车即可搜索
 - **记忆功能** - 搜索引擎偏好自动保存
 ### 🧩 小组件系统
 - **时间日期** - 实时数字时钟
 - **天气显示** - 当前温度和天气状态
 - **快捷方式** - 常用网站一键访问
 - **待办事项** - 可添加、勾选、本地保存
 - **常用书签** - YouTube、Twitter、StackOverflow等
 - **AI工具** - ChatGPT、Claude、豆包、Copilot快速入口
 ### ✋ 拖拽排序
 - **自由拖拽** - 所有小组件支持拖拽排序
 - **视觉反馈** - 拖拽时半透明、放大、高亮效果
 - **自动保存** - 位置自动保存，刷新不丢失
 ### 📱 响应式布局
 - 📱 **手机端** - 2列网格布局
 - 📱 **平板端** - 3列网格布局
 - 💻 **电脑端** - 4~6列自适应网格
 - 🖥️ **大屏优化** - 完美支持超宽屏
 ---
 ## 🚀 快速开始
 ### 方式一：直接使用
 1. 下载本项目
 2. 用浏览器打开 `index.html`
 3. 设为浏览器主页即可使用
 ### 方式二：本地部署
 \`\`\`bash
 # 克隆项目
 git clone https://github.com/yourname/ios-startpage.git
 # 进入目录
 cd ios-startpage
 # 使用任意HTTP服务器启动
 # 方式1: Python
 python3 -m http.server 8080
 # 方式2: Node.js
 npx serve .
 # 方式3: PHP
 php -S localhost:8080
 \`\`\`
 然后访问 `http://localhost:8080`
 ---
 ## 📁 项目结构
 \`\`\`
 ios-startpage/
 ├── index.html          # 主页面入口
 ├── README.md           # 项目说明文档
 ├── css/
 │   ├── root.css        # CSS变量定义（设计系统）
 │   └── main.css        # 主样式文件
 └── js/
     ├── main.js         # 核心业务逻辑
     └── widget.js       # 小组件拖拽系统
 \`\`\`
 ---
 ## 🛠️ 技术栈
 | 技术 | 说明 |
 |------|------|
 | **HTML5** | 语义化标签、原生拖拽API |
 | **CSS3** | CSS变量、Grid布局、backdrop-filter、动画 |
 | **JavaScript** | 原生ES6+、无任何框架依赖 |
 | **LocalStorage** | 数据持久化存储 |
 | **Font Awesome** | 图标库 |
 > ✅ **零依赖** - 纯原生实现，无需jQuery、React、Vue等框架
 ---
 ## ⚙️ 配置说明
 ### 修改搜索引擎
 编辑 `js/main.js` 中的 `CONFIG` 对象：
 \`\`\`javascript
 const CONFIG = {
     searchEngines: {
         baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
         // 添加你的自定义搜索引擎
         custom: { name: '自定义', url: 'https://xxx.com/search?q=' }
     }
 }
 \`\`\`
 ### 修改快捷方式
 编辑 `index.html` 中的快捷方式小组件：
 \`\`\`html
 <a href="你的网址" target="_blank" class="shortcut-item">
     <div class="shortcut-icon" style="background: #颜色值;">
         <i class="fa fa-图标名"></i>
     </div>
     <span class="shortcut-name">名称</span>
 </a>
 \`\`\`
 ### 自定义主题色
 编辑 `css/root.css` 中的CSS变量：
 \`\`\`css
 :root {
     --ios-blue: #007AFF;      /* 主色调 */
     --ios-green: #34C759;     /* 绿色 */
     --ios-red: #FF3B30;       /* 红色 */
     /* ... */
 }
 \`\`\`
 ---
 ## 🎯 浏览器支持
 | ![Chrome](https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png) | ![Firefox](https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png) | ![Safari](https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png) | ![Edge](https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png) |
 | :---: | :---: | :---: | :---: |
 | ✅ 最新版 | ✅ 最新版 | ✅ 最新版 | ✅ 最新版 |
 > ⚠️ 毛玻璃(backdrop-filter)效果需要较新版本浏览器支持
 ---
 ## 🗺️ 开发计划
 - [x] 天气API对接，获取真实天气数据
 - [ ] 自定义背景图片上传
 - [ ] 更多小组件（便签、倒计时、新闻等）
 - [ ] 插件系统，支持第三方小组件
 - [ ] 数据云端同步
 - [ ] 国际化多语言支持
 ---
 ## 🤝 贡献
 欢迎提交 Issue 和 Pull Request！
 1. Fork 本项目
 2. 创建你的特性分支 (\`git checkout -b feature/AmazingFeature\`)
 3. 提交你的更改 (\`git commit -m 'Add some AmazingFeature'\`)
 4. 推送到分支 (\`git push origin feature/AmazingFeature\`)
 5. 开启一个 Pull Request
 ---
 ## 📄 许可证
 MIT License - 详见 [LICENSE](LICENSE) 文件
 ---
 ## 💖 致谢
 - 设计灵感来自 Apple iOS 16+
 - 图标来自 [Font Awesome](https://fontawesome.com/)
 ---
 **如果觉得好用，别忘了给个 ⭐ Star 支持一下！**
 Made with ❤️ by KD
 
 