# iOS 18 Redesign 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 对 KD 起始页进行全面视觉升级：Bing 壁纸 + 模糊/色调系统、控制中心式分组 Widget 布局、毛玻璃材质体系

**架构：** 纯静态 HTML/CSS/JS。新增 `lib/wallpaper.js` 管理壁纸生命周期，改造 `widget-framework.js` 支持分组布局，CSS 变量驱动材质体系

**技术栈：** vanilla JS, CSS custom properties, SortableJS, Web Animations API, localStorage

**工作流：** 每完成一个任务后，在浏览器中打开 `http://localhost:8081` 验证效果。如遇端口冲突自行更换。

---

### 任务 1：CSS 变量 — 新增玻璃卡片与壁纸设计 Token

**文件：** 修改 `src/css/variables.css:27-73`

在 `:root` 中的 `--dark-shadow-color` 之后、`--radius-sm` 之前，插入新的玻璃卡片和壁纸变量。在 `.dark` 中也添加对应的暗色覆盖。

- [ ] **步骤 1：在 `variables.css` 的 `:root` 中添加新变量**

在 `--shadow-color: rgba(0, 0, 0, 0.08);` 之后（第 26 行左右），插入：

```css
/* iOS 18 毛玻璃卡片体系（壁纸模式） */
--glass-card-bg: rgba(255, 255, 255, 0.12);
--glass-card-border: rgba(255, 255, 255, 0.08);
--glass-card-blur: 30px;
--glass-card-hover-bg: rgba(255, 255, 255, 0.18);

/* 搜索卡片（更高透明度） */
--glass-search-bg: rgba(255, 255, 255, 0.15);
--glass-search-blur: 40px;

/* 壁纸色调层 */
--tint-overlay: rgba(0, 0, 0, 0.12);
--dark-tint-overlay: rgba(0, 0, 0, 0.25);

/* 阴影体系 */
--shadow-glass: 0 4px 20px rgba(0, 0, 0, 0.06);
--shadow-glass-hover: 0 8px 32px rgba(0, 0, 0, 0.10);
--shadow-glass-drag: 0 20px 50px rgba(0, 0, 0, 0.15);
```

- [ ] **步骤 2：在 `.dark` 中添加暗色毛玻璃变量**

在第 36 行 `--dark-bg-primary: #000000;` 附近，或 `.dark` 块内已有变量之后，插入：

```css
--dark-glass-card-bg: rgba(40, 42, 54, 0.65);
--dark-glass-card-border: rgba(255, 255, 255, 0.06);
```

- [ ] **步骤 3：更新 widget 卡片基础的 padding**

在第 53 行，将 `--widget-padding: 20px;` 改为：

```css
--widget-padding: 16px 20px;
```

- [ ] **步骤 4：验证 CSS 无语法错误**

运行：`python3 -c "import re; css=open('src/css/variables.css').read(); assert re.search(r'--glass-card-bg', css); assert re.search(r'--dark-glass-card-bg', css); print('OK')"`

- [ ] **步骤 5：Commit**

```bash
git add src/css/variables.css
git commit -m "feat(css): add glass card and wallpaper design tokens

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 2：创建壁纸系统核心模块

**文件：** 创建 `src/js/lib/wallpaper.js`

本模块管理壁纸的完整生命周期：配置存储、Bing 每日一图获取、CSS 层级渲染。

- [ ] **步骤 1：创建 `src/js/lib/wallpaper.js`**

写入以下完整内容：

```javascript
/* ==========================================
   wallpaper.js - iOS 18 壁纸系统
   Bing 每日一图 · 模糊调色 · 暗化适配
   ========================================== */

const WALLPAPER_PRESETS = {
  preset1: { name: '暮光之城', gradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  preset2: { name: '海洋之心', gradient: 'linear-gradient(135deg, #000428, #004e92)' },
  preset3: { name: '极光', gradient: 'linear-gradient(135deg, #0B3D2E, #2E8B57, #0B3D2E)' },
  preset4: { name: '日暮', gradient: 'linear-gradient(135deg, #232526, #414345)' },
  preset5: { name: '樱花', gradient: 'linear-gradient(135deg, #f5f7fa, #c3cfe2, #f5e6e8)' },
  preset6: { name: '星空', gradient: 'linear-gradient(135deg, #0a0a2e, #1a1a4e, #0a0a2e)' },
};

const WALLPAPER_DEFAULT_CONFIG = {
  source: 'bing',     // 'bing' | 'preset' | 'custom'
  blur: 24,           // 0-40
  tintColor: 'rgba(0,0,0,0.15)',
  customImage: null,
  presetId: 'preset1',
};

const WIDGET_GROUPS_MAP = {
  tools:    { id: 'tools',    title: '常用工具', icon: 'fa-wrench',      types: ['clock', 'weather', 'time-progress'] },
  tasks:    { id: 'tasks',    title: '任务',     icon: 'fa-clipboard',    types: ['todo', 'bookmarks'] },
  shortcuts:{ id: 'shortcuts',title: '快捷方式', icon: 'fa-link',        types: ['shortcuts'] },
  news:     { id: 'news',     title: '资讯',     icon: 'fa-newspaper-o',  types: ['hotboard', 'daily-word'] },
};

const WallpaperSystem = {
  config: { ...WALLPAPER_DEFAULT_CONFIG },

  init() {
    this.loadConfig();
    this.apply();
    // 监听暗色模式变化，更新覆盖层
    const observer = new MutationObserver(() => {
      this.updateDarkOverlay();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    // 每日首次加载时尝试刷新 Bing 壁纸
    this._refreshIfNeeded();
  },

  loadConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem('wallpaper-config'));
      if (saved) Object.assign(this.config, WALLPAPER_DEFAULT_CONFIG, saved);
    } catch { /* 使用默认值 */ }
  },

  saveConfig() {
    localStorage.setItem('wallpaper-config', JSON.stringify(this.config));
  },

  async apply() {
    let bgImage = null;
    const src = this.config.source;

    if (src === 'bing') {
      bgImage = await this._getBingImage();
    } else if (src === 'preset') {
      bgImage = null; // 预设使用 gradient
    } else if (src === 'custom' && this.config.customImage) {
      bgImage = this.config.customImage;
    }

    this._renderLayers(bgImage);
    this.saveConfig();
  },

  /** 获取 Bing 每日一图 URL（含 localStorage 缓存） */
  async _getBingImage() {
    const today = new Date().toISOString().split('T')[0];
    try {
      const cached = JSON.parse(localStorage.getItem('wallpaper-bing-cache'));
      if (cached && cached.date === today && cached.url) {
        return cached.url;
      }
    } catch { /* 缓存无效，重新获取 */ }

    try {
      const resp = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN');
      if (!resp.ok) throw new Error('Bing API 响应异常');
      const data = await resp.json();
      if (data && data.images && data.images[0]) {
        const url = 'https://www.bing.com' + data.images[0].url;
        localStorage.setItem('wallpaper-bing-cache', JSON.stringify({ url, date: today }));
        return url;
      }
    } catch (e) {
      console.warn('Bing 壁纸获取失败:', e);
      // 尝试使用缓存的旧图
      try {
        const old = JSON.parse(localStorage.getItem('wallpaper-bing-cache'));
        if (old && old.url) return old.url;
      } catch { /* 无缓存 */ }
    }
    return null; // 全部失败 → fallback 到预设
  },

  /** 渲染背景层级到底层容器 */
  _renderLayers(bgImage) {
    let container = document.getElementById('wallpaper-layers');
    if (!container) {
      container = document.createElement('div');
      container.id = 'wallpaper-layers';
      container.style.cssText = 'position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;';
      const decoration = document.querySelector('.bg-decoration');
      if (decoration) {
        decoration.parentNode.insertBefore(container, decoration);
        decoration.remove(); // 移除旧装饰气泡
      } else {
        document.body.prepend(container);
      }
      // 移除 body 上的 bg-gradient class，它已不再需要
      document.body.classList.remove('bg-gradient');
    }

    container.innerHTML = '';

    // L0: 壁纸图片层
    const imgLayer = document.createElement('div');
    imgLayer.className = 'wp-layer wp-image';
    if (bgImage) {
      imgLayer.style.backgroundImage = `url(${JSON.stringify(bgImage)}`;
      imgLayer.style.backgroundSize = 'cover';
      imgLayer.style.backgroundPosition = 'center';
      imgLayer.style.backgroundRepeat = 'no-repeat';
    } else if (this.config.source === 'preset') {
      const preset = WALLPAPER_PRESETS[this.config.presetId] || WALLPAPER_PRESETS.preset1;
      imgLayer.style.background = preset.gradient;
    } else {
      // Fallback: gradient
      imgLayer.style.background = 'linear-gradient(135deg, #E0EAFF 0%, #F5E6FF 25%, #FFE6F0 50%, #FFF0E6 75%, #E6FFFA 100%)';
    }
    container.appendChild(imgLayer);

    // L1: 模糊层
    const blurLayer = document.createElement('div');
    blurLayer.className = 'wp-layer wp-blur';
    blurLayer.style.backdropFilter = `blur(${this.config.blur}px)`;
    blurLayer.style.webkitBackdropFilter = `blur(${this.config.blur}px)`;
    container.appendChild(blurLayer);

    // L2: 色调覆盖层
    const tintLayer = document.createElement('div');
    tintLayer.className = 'wp-layer wp-tint';
    tintLayer.style.background = this.config.tintColor;
    container.appendChild(tintLayer);

    // L3 (暗色模式): 深色覆盖层
    const darkLayer = document.createElement('div');
    darkLayer.className = 'wp-layer wp-dark';
    darkLayer.style.background = 'rgba(0,0,0,0)';
    darkLayer.style.transition = 'background 0.5s ease';
    container.appendChild(darkLayer);

    this._darkLayer = darkLayer;
    this.updateDarkOverlay();
  },

  /** 根据当前暗色模式更新暗化层 */
  updateDarkOverlay() {
    if (!this._darkLayer) return;
    const isDark = document.documentElement.classList.contains('dark');
    this._darkLayer.style.background = isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0)';
  },

  /** 每天首次加载时刷新 Bing 壁纸 */
  async _refreshIfNeeded() {
    if (this.config.source !== 'bing') return;
    const today = new Date().toISOString().split('T')[0];
    try {
      const cached = JSON.parse(localStorage.getItem('wallpaper-bing-cache'));
      if (cached && cached.date === today) return; // 今日已是最新
    } catch { /* 无缓存，需要获取 */ }
    await this.apply();
  },

  // ===== 公开 API =====

  setBlur(px) {
    this.config.blur = Math.max(0, Math.min(40, px));
    this.apply();
  },

  setTint(color) {
    this.config.tintColor = color;
    this.apply();
  },

  setSource(source) {
    if (source === 'preset') this.config.presetId = this.config.presetId || 'preset1';
    this.config.source = source;
    this.apply();
  },

  setPreset(id) {
    this.config.presetId = id;
    this.config.source = 'preset';
    this.apply();
  },

  setCustomImage(base64) {
    this.config.customImage = base64;
    this.config.source = 'custom';
    this.apply();
  },

  getConfig() {
    return { ...this.config };
  },

  getPresets() {
    return Object.entries(WALLPAPER_PRESETS).map(([id, p]) => ({ id, ...p }));
  }
};
```

- [ ] **步骤 2：验证文件创建成功**

运行：`wc -l src/js/lib/wallpaper.js`，预期输出行数 > 150。

- [ ] **步骤 3：Commit**

```bash
git add src/js/lib/wallpaper.js
git commit -m "feat: add wallpaper system core module

Bing daily image fetch, blur/tint/dark layers, localStorage config,
preset wallpapers fallback, dark mode auto-adjust.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 3：添加壁纸背景层 CSS

**文件：** 修改 `src/css/layout.css:7-56`

移除旧的 `.bg-gradient`、`.bg-decoration`、`.bg-bubble` 动画相关样式，替换为壁纸层级样式。

- [ ] **步骤 1：替换 `layout.css` 中的背景相关样式**

定位到第 7-56 行（`/* ========== 背景渐变与动画 ========== */` 到 `.bg-bubble` 动画结束），替换为：

```css
/* ========== 壁纸层级系统 ========== */
.wp-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.wp-image {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transition: background-image 0.5s ease;
}

.wp-blur {
    transition: backdrop-filter 0.5s ease, -webkit-backdrop-filter 0.5s ease;
}

.wp-tint {
    transition: background 0.5s ease;
}

.wp-dark {
    transition: background 0.5s ease;
}

/* ========== 备用背景（壁纸加载失败或未设置时） ========== */
body:not(.wallpaper-ready) {
    background: linear-gradient(135deg, #E0EAFF 0%, #F5E6FF 25%, #FFE6F0 50%, #FFF0E6 75%, #E6FFFA 100%);
    background-size: 400% 400%;
    animation: gradientShift 20s ease infinite;
}

.dark body:not(.wallpaper-ready) {
    background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 25%, #312E81 50%, #1E3A8A 75%, #0F172A 100%);
    background-size: 400% 400%;
}

@keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

/* ========== 装饰元素（仅在无壁纸时显示气泡） ========== */
.bg-decoration {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
}
```

- [ ] **步骤 2：验证 CSS 无语法错误**

运行：`python3 -c "import re; css=open('src/css/layout.css').read(); assert re.search(r'wp-layer', css); assert 'bg-bubble' not in css; print('OK')"`

- [ ] **步骤 3：Commit**

```bash
git add src/css/layout.css
git commit -m "feat(css): replace gradient bubbles with wallpaper layer system

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 4：添加壁纸设置页面

**文件：** 修改 `src/js/app/preferences.js` 和 `index.html`

在设置弹窗中添加「背景」二级导航页，支持来源选择、模糊滑块、色调选择。

- [ ] **步骤 1：在 `index.html` 的设置弹窗中添加「背景」入口和页面**

在 `index.html` 的设置弹窗内，定位到主题模式行后的背景设置（第 130-136 行）：

找到：
```html
<div class="setting-row">
  <div class="setting-row-left">
    <i class="fa fa-image setting-row-icon"></i>
    <span class="setting-row-label">背景风格</span>
  </div>
  <div id="bg-segment"></div>
</div>
```

替换为：
```html
<div class="setting-row setting-row-clickable" onclick="openWallpaperSettings()">
  <div class="setting-row-left">
    <i class="fa fa-image setting-row-icon"></i>
    <span class="setting-row-label">壁纸与背景</span>
  </div>
  <i class="fa fa-chevron-right setting-row-arrow"></i>
</div>
```

然后，在搜索设置子页面（`data-page="search"` 的 `nav-page`）之后，添加「壁纸与背景」子页面：

```html
<!-- ====== 壁纸与背景子页面 ====== -->
<div class="nav-page" data-page="wallpaper">
  <div class="nav-page-header">
    <button class="nav-back-btn" onclick="window.navPage?.pop()">
      <i class="fa fa-chevron-left"></i> 设置
    </button>
    <span class="nav-page-header-title">壁纸与背景</span>
  </div>

  <!-- 壁纸预览 -->
  <div class="settings-group">
    <div id="wp-preview" class="wp-settings-preview">
      <div class="wp-preview-label">当前壁纸</div>
      <div class="wp-preview-source" id="wp-preview-source">Bing 每日一图</div>
    </div>
  </div>

  <!-- 壁纸来源 -->
  <div class="settings-group">
    <div class="settings-card">
      <div class="setting-row">
        <div class="setting-row-left">
          <i class="fa fa-source setting-row-icon"></i>
          <span class="setting-row-label">壁纸来源</span>
        </div>
        <div id="wp-source-segment"></div>
      </div>
    </div>
  </div>

  <!-- 预设选择（仅在预设模式下显示） -->
  <div class="settings-group" id="wp-preset-group" style="display:none;">
    <div class="settings-card">
      <div id="wp-preset-list" class="wp-preset-grid"></div>
    </div>
  </div>

  <!-- 本地上传（仅在自定义模式下显示） -->
  <div class="settings-group" id="wp-upload-group" style="display:none;">
    <div class="settings-card">
      <div class="setting-row">
        <button type="button" class="wp-upload-btn" onclick="document.getElementById('wp-file-input').click()">
          <i class="fa fa-upload"></i> 选择图片
        </button>
        <input type="file" id="wp-file-input" accept="image/*" style="display:none;">
      </div>
    </div>
  </div>

  <!-- 模糊 -->
  <div class="settings-group">
    <div class="settings-card">
      <div class="setting-row">
        <div class="setting-row-left">
          <i class="fa fa-eye-slash setting-row-icon"></i>
          <span class="setting-row-label">模糊</span>
        </div>
        <span class="wp-slider-value" id="wp-blur-value">24px</span>
      </div>
      <div class="setting-row">
        <input type="range" id="wp-blur-slider" class="wp-slider" min="0" max="40" value="24">
      </div>
    </div>
  </div>

  <!-- 色调 -->
  <div class="settings-group">
    <div class="settings-card">
      <div class="setting-row">
        <div class="setting-row-left">
          <i class="fa fa-tint setting-row-icon"></i>
          <span class="setting-row-label">色调</span>
        </div>
      </div>
      <div class="setting-row">
        <div class="wp-tint-picker" id="wp-tint-picker"></div>
      </div>
    </div>
  </div>
</div>
```

- [ ] **步骤 2：在 `preferences.js` 中添加壁纸设置逻辑**

在文件末尾添加：

```javascript
// ========== 壁纸与背景设置 ==========

// 壁纸来源分段器
let wpSourceSegment;

// 预设色调颜色
const WP_TINT_COLORS = [
  { label: '无', color: 'rgba(0,0,0,0)' },
  { label: '黑色', color: 'rgba(0,0,0,0.15)' },
  { label: '深蓝', color: 'rgba(20,20,60,0.2)' },
  { label: '紫色', color: 'rgba(45,27,105,0.2)' },
  { label: '深绿', color: 'rgba(20,60,40,0.2)' },
  { label: '暖棕', color: 'rgba(60,40,30,0.2)' },
  { label: '石板', color: 'rgba(44,62,80,0.2)' },
];

function openWallpaperSettings() {
  if (!navPage) initSettingsNavigation();
  if (!wpSourceSegment) initWallpaperSettings();
  navPage.push('wallpaper');
  updateWallpaperPreview();
}

function initWallpaperSettings() {
  // 壁纸来源分段器
  wpSourceSegment = new UISegment({
    el: document.getElementById('wp-source-segment'),
    options: [
      { value: 'bing',    label: 'Bing' },
      { value: 'preset',  label: '预设' },
      { value: 'custom',  label: '本地上传' },
    ],
    initialValue: WallpaperSystem.getConfig().source,
    onChange: (value) => {
      WallpaperSystem.setSource(value);
      updateWallpaperUIState(value);
      updateWallpaperPreview();
    }
  });

  // 预设列表
  renderPresetList();

  // 本地上传
  document.getElementById('wp-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      WallpaperSystem.setCustomImage(ev.target.result);
      updateWallpaperPreview();
    };
    reader.readAsDataURL(file);
  });

  // 模糊滑块
  const blurSlider = document.getElementById('wp-blur-slider');
  const blurValue = document.getElementById('wp-blur-value');
  blurSlider.addEventListener('input', () => {
    blurValue.textContent = blurSlider.value + 'px';
  });
  blurSlider.addEventListener('change', () => {
    WallpaperSystem.setBlur(parseInt(blurSlider.value));
  });

  // 色调选择器
  renderTintPicker();

  // 初始状态
  updateWallpaperUIState(WallpaperSystem.getConfig().source);
}

function renderPresetList() {
  const container = document.getElementById('wp-preset-list');
  container.innerHTML = WallpaperSystem.getPresets().map(p => `
    <button class="wp-preset-item" data-preset="${p.id}" onclick="selectPreset('${p.id}')">
      <div class="wp-preset-thumb" style="background:${p.gradient};border-radius:8px;height:50px;"></div>
      <span class="wp-preset-name">${p.name}</span>
    </button>
  `).join('');
}

function selectPreset(id) {
  WallpaperSystem.setPreset(id);
  updateWallpaperPreview();
}

function renderTintPicker() {
  const container = document.getElementById('wp-tint-picker');
  const current = WallpaperSystem.getConfig().tintColor;
  container.innerHTML = WP_TINT_COLORS.map(t => `
    <button class="wp-tint-btn ${t.color === current ? 'active' : ''}"
            data-tint="${t.color}"
            onclick="selectTint('${t.color}')"
            title="${t.label}">
      <span class="wp-tint-swatch" style="background:${t.color};"></span>
    </button>
  `).join('');
}

function selectTint(color) {
  WallpaperSystem.setTint(color);
  document.querySelectorAll('.wp-tint-btn').forEach(b => b.classList.toggle('active', b.dataset.tint === color));
}

function updateWallpaperUIState(source) {
  document.getElementById('wp-preset-group').style.display = source === 'preset' ? '' : 'none';
  document.getElementById('wp-upload-group').style.display = source === 'custom' ? '' : 'none';
}

function updateWallpaperPreview() {
  const cfg = WallpaperSystem.getConfig();
  const sourceMap = { bing: 'Bing 每日一图', preset: '预设壁纸', custom: '本地上传' };
  document.getElementById('wp-preview-source').textContent = sourceMap[cfg.source] || '未知';
}
```

- [ ] **步骤 3：在 `preferences.js` 中移除旧的 `setBackground` 函数**

删除 `preferences.js` 中的：
```javascript
function setBackground(type) {
    localStorage.setItem('background', type);
}
```
和 `initUISegments()` 中对 `bgSegment` 的初始化和创建（第 484-494 行），因为背景设置已迁移到新页面。

在 `app.js` 中移除：
```javascript
// 背景风格分段器
bgSegment = new UISegment({
  el: document.getElementById('bg-segment'),
  ...
});
```
和 `let bgSegment;` 声明。

- [ ] **步骤 4：Commit**

```bash
git add index.html src/js/app/preferences.js src/js/app/app.js
git commit -m "feat(settings): add wallpaper settings page with source/blur/tint controls

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 5：壁纸系统初始化入口

**文件：** 修改 `src/js/app/app.js`

在 `DOMContentLoaded` 中调用壁纸初始化，并添加 `openWallpaperSettings()` 桥接函数。

- [ ] **步骤 1：在 `app.js` 的 `DOMContentLoaded` 中添加上面的 `openWallpaperSettings` 引用和壁纸初始化**

在 `WidgetFramework.init();` 之后（第 145 行左右），添加：
```javascript
// 壁纸系统初始化
if (typeof WallpaperSystem !== 'undefined') {
    WallpaperSystem.init();
    document.body.classList.add('wallpaper-ready');
}

// 暴露壁纸设置入口（函数已定义在 preferences.js 中）
```

在文件末尾附近添加一个空函数占位（防止引用错误）：
```javascript
// openWallpaperSettings 定义在 preferences.js 中
// 此处仅确保调用安全
```

实际上 `openWallpaperSettings` 会在 `preferences.js` 中定义，脚本加载顺序中 `preferences.js` 在 `app.js` 之后，所以需要确保引用在前。由于它们都是全局函数，在 `DOMContentLoaded` 时都已可用，不需要额外处理。

只需在 `WidgetFramework.init();` 之后插入：
```javascript
// 壁纸系统初始化（wallpaper.js 需在 app.js 之前加载）
if (typeof WallpaperSystem !== 'undefined') {
    WallpaperSystem.init();
    document.body.classList.add('wallpaper-ready');
}
```

- [ ] **步骤 2：在 `index.html` 中添加 `wallpaper.js` 的 `<script>` 标签**

在 `uapi.js` 的 script 标签之前（第 333 行），添加：
```html
<script src="./src/js/lib/wallpaper.js"></script>
```

- [ ] **步骤 3：移除不再需要的 `bgSegment` 相关代码**

在 `app.js` 中：
1. 将 `let themeSegment, bgSegment;` 改为 `let themeSegment;`
2. 移除 `bgSegment` 的创建代码（整个 `bgSegment = new UISegment({...})` 块）

- [ ] **步骤 4：Commit**

```bash
git add src/js/app/app.js index.html
git commit -m "feat: integrate wallpaper system at app startup

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 6：Widget 卡片毛玻璃材质升级

**文件：** 修改 `src/css/widgets.css`

将 widget 卡片背景从纯色 `var(--card-bg)` 改为毛玻璃材质，更新阴影和悬停效果。

- [ ] **步骤 1：更新 `.widget` 基础样式**

找到 `.widget` 规则（第 19-31 行），替换为：

```css
.widget {
    background: var(--glass-card-bg);
    backdrop-filter: blur(var(--glass-card-blur));
    -webkit-backdrop-filter: blur(var(--glass-card-blur));
    border-radius: var(--radius-card);
    padding: var(--widget-padding);
    cursor: grab;
    user-select: none;
    position: relative;
    border: 0.5px solid var(--glass-card-border);
    box-shadow: var(--shadow-glass);
    transition: box-shadow 0.4s var(--spring-smooth),
                border-color 0.4s var(--spring-smooth),
                background 0.4s var(--spring-smooth);
    transform: translateY(0);
    animation: widgetSpringIn 0.5s var(--spring-bounce) both;
    overflow-y: auto;
}
```

- [ ] **步骤 2：更新 `.widget:hover`**

找到 `.widget:hover`（第 60-63 行），替换为：

```css
.widget:hover {
    background: var(--glass-card-hover-bg);
    box-shadow: var(--shadow-glass-hover);
    border-color: transparent;
}
```

- [ ] **步骤 3：更新暗色模式下的 widget hover**

找到 `.dark .widget:hover`（第 65-67 行），替换为：

```css
.dark .widget:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: var(--ios-blue);
}
```

- [ ] **步骤 4：添加暗色模式 widget 基础样式**

在 `.dark .widget:hover` 之后添加：

```css
.dark .widget {
    background: var(--dark-glass-card-bg);
    border-color: var(--dark-glass-card-border);
}
```

- [ ] **步骤 5：更新拖拽阴影**

找到 `.widget-drag`（第 276-282 行），将 `box-shadow` 改为：

```css
.widget-drag {
    box-shadow: var(--shadow-glass-drag) !important;
    ...
}
```

同样更新 `.widget-dragging`（第 311 行）：
```css
.widget-dragging {
    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.25) !important;
    ...
}
```

- [ ] **步骤 6：在 `.widgets-area` 中移除背景色（让毛玻璃透出壁纸）**

确保 `.widgets-area` 没有背景色（它应该是透明的）。当前第 7-14 行已有 `background: transparent;` 继承，不需要改动。

但需添加一个 z-index 确保内容在壁纸之上：
```css
.container-main {
    position: relative;
    z-index: 10;
    ...
}
```

- [ ] **步骤 7：Commit**

```bash
git add src/css/widgets.css src/css/layout.css
git commit -m "feat(css): upgrade widget cards to frosted glass material

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 7：弹窗与搜索卡片毛玻璃升级

**文件：** 修改 `src/css/dialogs.css` 和 `src/css/layout.css`

- [ ] **步骤 1：更新搜索卡片毛玻璃（`layout.css`）**

找到 `.search-card` 规则（第 85-103 行），更新背景和模糊：

```css
.search-card {
    display: flex;
    flex-direction: column;
    width: min(520px, 92vw);
    background: var(--glass-search-bg);
    backdrop-filter: blur(var(--glass-search-blur));
    -webkit-backdrop-filter: blur(var(--glass-search-blur));
    border: 0.5px solid var(--glass-card-border);
    border-radius: 18px;
    box-shadow: var(--shadow-glass);
    transition: border-color 0.3s var(--spring-smooth),
                box-shadow 0.3s var(--spring-smooth),
                border-radius 0.35s var(--spring-smooth);
    position: relative;
    animation: searchCardIn 0.7s var(--spring-slide) 0.1s both;
}
```

更新 `.dark .search-card`（第 106-113 行）：

```css
.dark .search-card {
    background: var(--dark-glass-card-bg);
    border-color: var(--dark-glass-card-border);
    box-shadow: 0 8px 40px rgba(0,0,0,0.2);
}
```

- [ ] **步骤 2：更新搜索卡片 focus 状态**

更新 `.search-card:focus-within`（第 123-129 行），只改阴影部分：

```css
.search-card:focus-within {
    border-color: var(--ios-blue);
    box-shadow: 0 8px 40px rgba(0,122,255,0.12),
                0 0 0 3px rgba(0,122,255,0.08);
}
```

- [ ] **步骤 3：更新浮动底栏毛玻璃**

在 `layout.css` 中找到 `.floating-bar`（第 399-416 行），保持现有样式已足够（已经是 rgba + blur），将背景改为引用新变量：

```css
.floating-bar {
    ...
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border: 0.5px solid rgba(255, 255, 255, 0.35);
    ...
}
```

保持现状，因为它已经符合设计。

- [ ] **步骤 4：根据设计更新弹窗玻璃效果（`dialogs.css`）**

`.modal-overlay` 的背景改为：
```css
.modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    z-index: 100; display: none;
    align-items: center; justify-content: center; padding: 20px;
    overflow-y: auto;
}
```

`.modal-content` 使用 `var(--glass-card-bg)` 而非 `var(--card-bg)`：
```css
.modal-content {
    width: 100%; max-width: 420px;
    background: var(--glass-card-bg);
    backdrop-filter: blur(var(--glass-card-blur));
    -webkit-backdrop-filter: blur(var(--glass-card-blur));
    border-radius: var(--radius-lg);
    border: 0.5px solid var(--glass-card-border);
    ...
}
```

更新 `.modal-bottom-sheet` 同样使用玻璃材质（第 572-587 行）：
```css
.modal-bottom-sheet {
    background: var(--glass-card-bg);
    backdrop-filter: blur(var(--glass-card-blur));
    -webkit-backdrop-filter: blur(var(--glass-card-blur));
    border: 0.5px solid var(--glass-card-border);
    ...
}
```

- [ ] **步骤 5：Commit**

```bash
git add src/css/layout.css src/css/dialogs.css
git commit -m "feat(css): upgrade search card and dialogs to frosted glass

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 8：控制中心分组布局 — widget-framework.js 核心重构

**文件：** 修改 `src/js/lib/widget-framework.js`

这是最核心的变更：将扁平布局改为分组布局，重写 `render()`、`addWidget()`、`removeWidget()`、`_enableDragDrop()`，添加 v2→v3 迁移逻辑。

- [ ] **步骤 1：在 `WidgetFramework` 中添加分组常量和工具方法**

在 `WidgetFramework` 对象内，`_layoutVersion: 3`（改为 3），添加：

```javascript
_layoutVersion: 3,         // 当前布局版本 v3 = 分组

// ===== 分组定义 =====
WIDGET_GROUPS: [
    { id: 'tools',     title: '常用工具', icon: 'fa-wrench',      types: ['clock', 'weather', 'time-progress'] },
    { id: 'tasks',     title: '任务',     icon: 'fa-clipboard',    types: ['todo', 'bookmarks'] },
    { id: 'shortcuts', title: '快捷方式', icon: 'fa-link',        types: ['shortcuts'] },
    { id: 'news',      title: '资讯',     icon: 'fa-newspaper-o',  types: ['hotboard', 'daily-word'] },
],

getGroupForType(type) {
    const group = this.WIDGET_GROUPS.find(g => g.types.includes(type));
    return group ? group.id : 'other';
},

getGroupDef(id) {
    return this.WIDGET_GROUPS.find(g => g.id === id) || { id: 'other', title: '其他', icon: 'fa-puzzle-piece' };
},
```

- [ ] **步骤 2：修改 `WidgetArea` 的 `loadLayout()` 支持 v3 和自动迁移**

更新 `loadLayout()`（第 504-517 行）为：

```javascript
loadLayout() {
    const all = WidgetFramework.getLayout();
    const version = all._version || 1;
    let areaLayout = all[this.id];

    // 处理空布局
    if (!areaLayout) {
        areaLayout = this._getDefaultLayout();
    }

    if (version < WidgetFramework._layoutVersion) {
        areaLayout = this._migrateLayout(areaLayout, version);
        all[this.id] = areaLayout;
        all._version = WidgetFramework._layoutVersion;
        WidgetFramework.saveLayout(all);
    }

    this.layout = areaLayout;
}
```

替换 `_migrateLayout()`（第 520-534 行）为：

```javascript
_migrateLayout(layout, fromVersion) {
    // v2 → v3: 扁平数组 → 分组格式
    if (fromVersion < 3) {
        let flat;
        if (Array.isArray(layout)) {
            // v0/v1 或 v2: layout 是数组
            if (fromVersion < 2) {
                // v0/v1: 没有 position，需要计算
                const cols = this._getColumnCount();
                const grid = new GridTracker(cols);
                layout.forEach(item => {
                    const WidgetClass = WidgetFramework.registry.get(item.type);
                    const defaultSize = WidgetClass ? WidgetClass.defaultSize : 'sm';
                    const size = item.size || defaultSize;
                    const pos = grid.findNextAvailable(size);
                    item.size = size;
                    item.config = item.config || {};
                    item.position = { col: pos.col, row: pos.row };
                    grid.occupy(pos.col, pos.row, size);
                });
            }
            flat = layout;
        } else if (layout && layout.groups) {
            // 已经是分组格式但版本低
            return layout;
        } else {
            flat = [];
        }

        // 按类型分组
        const groupMap = {};
        WidgetFramework.WIDGET_GROUPS.forEach(g => { groupMap[g.id] = []; });
        groupMap.other = [];

        flat.forEach(item => {
            const gid = WidgetFramework.getGroupForType(item.type);
            if (!groupMap[gid]) groupMap[gid] = [];
            groupMap[gid].push({
                type: item.type,
                size: item.size || 'sm',
                config: item.config || {}
            });
        });

        // 移除空组
        const groups = [];
        WidgetFramework.WIDGET_GROUPS.forEach(g => {
            if (groupMap[g.id] && groupMap[g.id].length > 0) {
                groups.push({ ...g, widgets: groupMap[g.id] });
            }
        });
        if (groupMap.other && groupMap.other.length > 0) {
            groups.push({ id: 'other', title: '其他', icon: 'fa-puzzle-piece', widgets: groupMap.other, types: [] });
        }

        return { groups };
    }
    return layout;
}
```

更新 `_getDefaultLayout()` 返回新的默认格式：

```javascript
_getDefaultLayout() {
    const str = this.container.dataset.defaultWidgets;
    if (!str) return { groups: [] };
    try {
        const parsed = JSON.parse(str);
        // 兼容旧格式（扁平数组）
        if (Array.isArray(parsed)) {
            return this._migrateLayout(parsed, 2);
        }
        return parsed;
    } catch {
        return { groups: [] };
    }
}
```

更新 `saveLayout()`（第 546-551 行），简化——因为 `this.layout` 已经包含正确的 v3 结构，只需保存：

```javascript
saveLayout() {
    const all = WidgetFramework.getLayout();
    all[this.id] = this.layout;
    all._version = WidgetFramework._layoutVersion;
    WidgetFramework.saveLayout(all);
}
```

- [ ] **步骤 3：重写 `render()` 方法**

删除旧 `render()` 和 `_layoutForBreakpoint()` 方法，替换为：

```javascript
render() {
    this.container.innerHTML = '';
    this.widgets = [];
    this._groupElements = {};
    this._sortableInstances = [];

    // 确保布局是 v3 格式
    if (!this.layout || !this.layout.groups) {
        this.layout = { groups: [] };
    }

    const cols = this._getColumnCount();
    this._lastCols = cols;

    this.layout.groups.forEach((group, gi) => {
        // 创建分组 section
        const section = document.createElement('section');
        section.className = 'widget-group';
        section.dataset.group = group.id;

        // 分组标题
        const header = document.createElement('div');
        header.className = 'widget-group-header';
        header.innerHTML = `<i class="fa ${group.icon}"></i><span>${group.title}</span>`;
        section.appendChild(header);

        // 分组网格容器
        const grid = document.createElement('div');
        grid.className = 'widget-group-grid';
        grid.dataset.groupGrid = group.id;
        section.appendChild(grid);

        this.container.appendChild(section);
        this._groupElements[group.id] = grid;

        // 计算该组的网格位置
        const positioned = this._layoutGroupForBreakpoint(group.widgets, cols);

        positioned.forEach((item, sortIndex) => {
            const WidgetClass = WidgetFramework.registry.get(item.type);
            if (!WidgetClass) return;
            const widget = new WidgetClass(this.container, this.widgets.length);
            const dom = widget.createDOM();

            const span = this._span(item.size, cols);
            const pos = item.position || { col: 1, row: 1 };
            dom.style.gridColumn = `${pos.col} / span ${span}`;
            dom.style.gridRow = `${pos.row} / span 1`;
            dom.dataset.position = JSON.stringify(pos);
            dom.dataset.groupId = group.id;

            grid.appendChild(dom);

            // 上下文菜单
            dom.addEventListener('contextmenu', (e) => widget.onContextMenu(e));

            widget.render();
            widget.animateIn(sortIndex * 0.06);
            this.widgets.push(widget);
        });
    });

    this._enableDragDrop();
}

/** 计算一组内 widgets 的网格位置 */
_layoutGroupForBreakpoint(widgets, cols) {
    const grid = new GridTracker(cols);
    return widgets.map(item => {
        let size = item.size;
        if (cols === 1) {
            size = 'sm';
        } else if (cols === 2 && size === 'lg') {
            size = 'md';
        }
        const pos = grid.findNextAvailable(size);
        grid.occupy(pos.col, pos.row, size);
        return { ...item, size, position: pos };
    });
}
```

- [ ] **步骤 4：重写 `_enableDragDrop()` 为每组独立实例**

替换整个 `_enableDragDrop()` 方法（第 787-843 行）：

```javascript
_enableDragDrop() {
    if (typeof Sortable === 'undefined') {
        console.warn('SortableJS 未加载，拖拽排序不可用');
        return;
    }

    // 销毁旧实例
    if (this._sortableInstances) {
        this._sortableInstances.forEach(s => s.destroy());
    }
    this._sortableInstances = [];

    this.container.querySelectorAll('.widget-group-grid').forEach(grid => {
        const groupId = grid.dataset.groupGrid;
        const sortable = new Sortable(grid, {
            animation: 300,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            handle: '.widget-content',
            draggable: '.widget',
            delay: 600,
            delayOnTouchOnly: true,
            touchStartThreshold: 5,
            filter: '',
            preventOnFilter: false,
            ghostClass: 'widget-ghost',
            chosenClass: 'widget-chosen',
            dragClass: 'widget-drag',
            onChoose: (evt) => {
                evt.item.classList.add('widget-waiting');
                if (navigator.vibrate) navigator.vibrate(10);
            },
            onUnchoose: (evt) => {
                evt.item.classList.remove('widget-waiting');
            },
            onStart: (evt) => {
                evt.item.classList.remove('widget-waiting');
                evt.item.classList.add('widget-dragging');
            },
            onEnd: (evt) => {
                evt.item.classList.remove('widget-dragging', 'widget-waiting');
                if (evt.oldIndex === evt.newIndex) return;
                this._moveWidgetInGroup(groupId, evt.oldIndex, evt.newIndex);
            }
        });
        this._sortableInstances.push(sortable);
    });
}
```

- [ ] **步骤 5：更新 `addWidget()` 和 `removeWidget()` / `_doRemove()`**

替换 `addWidget()`（第 683-713 行）：

```javascript
addWidget(type, size) {
    const WidgetClass = WidgetFramework.registry.get(type);
    if (!WidgetClass) return false;

    // 获取目标组
    const groupId = WidgetFramework.getGroupForType(type);
    let group = this.layout.groups.find(g => g.id === groupId);
    if (!group) {
        const def = WidgetFramework.getGroupDef(groupId);
        group = { ...def, widgets: [] };
        this.layout.groups.push(group);
    }

    // 检查数量限制
    const count = group.widgets.filter(w => w.type === type).length;
    if (count >= (WidgetClass.maxPerArea || Infinity)) {
        alert(`该区域最多添加 ${WidgetClass.maxPerArea} 个"${WidgetClass.displayName}"`);
        return false;
    }

    group.widgets.push({
        type,
        size: size || WidgetClass.defaultSize || 'sm',
        config: {}
    });

    this.saveLayout();
    this.render();
    return true;
}
```

替换 `_doRemove()`（第 735-749 行）：

```javascript
_doRemove(widgetIdx) {
    if (!this._pendingRemove) return;
    this._pendingRemove = false;

    if (widgetIdx < 0 || widgetIdx >= this.widgets.length) return;
    const widgetInstance = this.widgets[widgetIdx];

    // 根据全局 widget 索引找到对应的组和组内索引
    let globalIdx = 0;
    for (const g of this.layout.groups) {
        const wList = g.widgets || [];
        if (widgetIdx < globalIdx + wList.length) {
            const localIdx = widgetIdx - globalIdx;
            wList.splice(localIdx, 1);
            if (wList.length === 0) {
                // 空组自动移除
                this.layout.groups = this.layout.groups.filter(gg => gg.id !== g.id);
            }
            break;
        }
        globalIdx += wList.length;
    }

    if (widgetInstance) widgetInstance.destroy();
    this.saveLayout();
    this.render();
}
```

更新 `removeWidget()` 中的引用（第 715 行）：需要追踪 widget 在 groups 中的索引。将 `removeWidget()` 加上索引映射：

```javascript
removeWidget(widgetInstance) {
    if (this._pendingRemove) return;
    const idx = this.widgets.indexOf(widgetInstance);
    if (idx === -1) return;
    const el = widgetInstance.element;
    if (el) {
        this._pendingRemove = true;
        const anim = widgetInstance.animateOut();
        anim.finished.then(() => {
            this._doRemove(idx);
        }).catch(() => {
            this._doRemove(idx);
        });
        setTimeout(() => this._doRemove(idx), 500);
    } else {
        this._doRemove(idx);
    }
}
```

- [ ] **步骤 6：更新 `compactAll()` 和 `_compactPositions()`**

替换 `_compactPositions()`（第 753-762 行）和 `compactAll()`（第 765-769 行）：

```javascript
_compactPositions() {
    if (!this.layout.groups) return;
    const cols = this._getColumnCount();
    this.layout.groups.forEach(group => {
        if (!group.widgets) return;
        const grid = new GridTracker(cols);
        group.widgets.forEach(item => {
            let size = item.size;
            if (cols === 1) size = 'sm';
            else if (cols === 2 && size === 'lg') size = 'md';
            const pos = grid.findNextAvailable(size);
            item.position = { col: pos.col, row: pos.row };
            grid.occupy(pos.col, pos.row, size);
        });
    });
}

compactAll() {
    this._compactPositions();
    this.saveLayout();
    this.render();
}
```

- [ ] **步骤 7：添加 `_moveWidgetInGroup()` 辅助方法**

在 `_enableDragDrop()` 之前添加：

```javascript
/** 组内移动 widget（SortableJS onEnd 回调） */
_moveWidgetInGroup(groupId, fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const group = this.layout.groups.find(g => g.id === groupId);
    if (!group || !group.widgets) return;
    const [moved] = group.widgets.splice(fromIdx, 1);
    group.widgets.splice(toIdx, 0, moved);
    this.saveLayout();
    this.render();
}
```

- [ ] **步骤 8：更新 `moveWidget()` 方法**

将旧的 `moveWidget()`（第 771-785 行）替换为跨组移动的支持（供上下文菜单使用）：

```javascript
/** 跨组移动 widget（供上下文菜单使用） */
moveWidgetToGroup(widgetInstance, targetGroupId) {
    const sourceGroupId = widgetInstance.element?.dataset.groupId;
    if (!sourceGroupId || sourceGroupId === targetGroupId) return;

    const srcGroup = this.layout.groups.find(g => g.id === sourceGroupId);
    const dstGroup = this.layout.groups.find(g => g.id === targetGroupId);
    if (!srcGroup || !dstGroup) return;

    // 找到在 srcGroup.widgets 中的索引
    const globalIdx = this.widgets.indexOf(widgetInstance);
    if (globalIdx === -1) return;

    let srcIdx = -1;
    let counter = 0;
    for (const g of this.layout.groups) {
        for (let i = 0; i < (g.widgets || []).length; i++) {
            if (counter === globalIdx && g.id === sourceGroupId) {
                srcIdx = i;
                break;
            }
            counter++;
        }
        if (srcIdx >= 0) break;
    }

    if (srcIdx < 0) return;
    const [moved] = srcGroup.widgets.splice(srcIdx, 1);
    dstGroup.widgets.push(moved);

    // 移除空组
    this.layout.groups = this.layout.groups.filter(g => g.widgets.length > 0);

    this._compactPositions();
    this.saveLayout();
    this.render();
}
```

- [ ] **步骤 9：在 `destroy()` 中清理 Sortable 实例**

更新 `destroy()`（第 672-679 行）：

```javascript
destroy() {
    if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
    }
    if (this._sortableInstances) {
        this._sortableInstances.forEach(s => s.destroy());
        this._sortableInstances = [];
    }
}
```

- [ ] **步骤 10：更新 `init()` 中的排序初始化**

将 `this._enableDragDrop();` 的调用保留在 render() 末尾，init() 中不再需要单独调用（因为 render() 现在负责调用）。更新 `init()`（第 495-500 行）：

```javascript
init() {
    this.loadLayout();
    this.render();
    this._initResizeObserver();
}
```

- [ ] **步骤 11：Commit**

```bash
git add src/js/lib/widget-framework.js
git commit -m "feat: implement control-center grouped widget layout

- v2→v3 layout migration (flat array → groups)
- Group-aware render() with section headers
- Per-group SortableJS drag-and-drop
- Cross-group widget movement support
- Group-aware add/remove/compact

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 9：分组标题 CSS 样式

**文件：** 修改 `src/css/widgets.css`

在 widget 通用规则后、具体 widget 样式前，添加分组标题样式。

- [ ] **步骤 1：在 `widgets.css` 的 `.widget:hover` 之后添加分组标题规则**

在 `.dark .widget:hover` 之后（约第 68 行）、`.widget, .widget-content` 之前，插入：

```css
/* ========== 控制中心分组标题 ========== */
.widget-group {
    margin-bottom: 4px;
    break-inside: avoid;
}

.widget-group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 4px 10px;
    color: rgba(255, 255, 255, 0.45);
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    animation: groupHeaderIn 0.4s var(--spring-slide) both;
}

@keyframes groupHeaderIn {
    from {
        opacity: 0;
        transform: translateX(-12px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.widget-group-header .fa {
    font-size: 12px;
    opacity: 0.7;
}

.dark .widget-group-header {
    color: rgba(255, 255, 255, 0.35);
}

/* 分组网格（内部使用 grid 布局） */
.widget-group-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--widget-gap);
    position: relative;
}

/* 响应式：分组网格列数随断点变化 */
@media (max-width: 768px) {
    .widget-group-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }
    .widget-group-header {
        font-size: 11px;
        padding: 8px 4px 6px;
    }
}

@media (max-width: 480px) {
    .widget-group-grid {
        grid-template-columns: 1fr;
        gap: 10px;
    }
    .widget-group-header {
        font-size: 10px;
        padding: 6px 4px 4px;
    }
}
```

- [ ] **步骤 2：更新 `.widgets-area` 基础样式**

修改 `.widgets-area`（第 7-14 行），移除原来的 grid 声明（因为现在由 `.widget-group-grid` 负责）：

```css
.widgets-area {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
    flex-shrink: 0;
}
```

- [ ] **步骤 3：移除旧的入场延迟序列**

删除第 49-56 行（`.widget:nth-child(n)` 入场延迟），因为分组后子元素选择器不再适用。（入场动画已由 `widget.animateIn()` 在 JS 中处理。）

- [ ] **步骤 4：Commit**

```bash
git add src/css/widgets.css
git commit -m "feat(css): add control-center group header styles

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 10：上下文菜单 — 跨组移动支持

**文件：** 修改 `src/js/lib/widget-framework.js` 中的 `getContextMenuItems()`

- [ ] **步骤 1：更新 `Widget` 基类的 `getContextMenuItems()` 方法**

在 `getContextMenuItems()`（第 448-461 行）中的「移除小组件」之前，添加跨组移动子菜单：

```javascript
getContextMenuItems() {
    const items = [];
    items.push({ id: 'size', label: '切换尺寸', icon: '🔃', action: () => this.cycleSize() });
    if (this.openManager !== Widget.prototype.openManager) {
        items.push({ id: 'manage', label: '管理', icon: '✏️', action: () => this.openManager() });
    }

    // 跨组移动子菜单
    const currentGroupId = this.element?.dataset.groupId;
    const availableGroups = WidgetFramework.WIDGET_GROUPS.filter(g => g.id !== currentGroupId);
    if (availableGroups.length > 0) {
        items.push({ type: 'separator' });
        items.push({ id: 'move-header', label: '移动到...', icon: '📦', action: () => {} });
        availableGroups.forEach(g => {
            items.push({
                id: `move-to-${g.id}`,
                label: `  ${g.title}`,
                icon: '',
                action: () => {
                    const areaId = this.container.closest('[data-widget-area]').dataset.widgetArea;
                    const area = WidgetFramework.areas.get(areaId);
                    if (area) area.moveWidgetToGroup(this, g.id);
                }
            });
        });
    }

    items.push({ type: 'separator' });
    items.push({ id: 'delete', label: '移除小组件', icon: '🗑️', destructive: true, action: () => {
        const areaId = this.container.closest('[data-widget-area]').dataset.widgetArea;
        WidgetFramework.areas.get(areaId)?.removeWidget(this);
    }});
    return items;
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/js/lib/widget-framework.js
git commit -m "feat: add cross-group widget move in context menu

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 任务 11：更新 index.html — 新格式默认布局 + 壁纸设置 CSS

**文件：** 修改 `index.html` 和新增 `src/css/wallpaper-settings.css`

- [ ] **步骤 1：更新 `index.html` 中的默认 Widget 布局为分组格式**

将第 63-65 行的 `data-default-widgets` 替换为：

```html
<div class="widgets-area" data-widget-area="main-area" data-default-widgets='{"groups":[
  {"id":"tools","title":"常用工具","icon":"fa-wrench","widgets":[{"type":"clock","size":"sm"},{"type":"weather","size":"sm"}]},
  {"id":"tasks","title":"任务","icon":"fa-clipboard","widgets":[{"type":"todo","size":"sm"},{"type":"bookmarks","size":"md"}]},
  {"id":"shortcuts","title":"快捷方式","icon":"fa-link","widgets":[{"type":"shortcuts","size":"sm"}]},
  {"id":"news","title":"资讯","icon":"fa-newspaper-o","widgets":[{"type":"hotboard","size":"md"}]}
]}'>
```

- [ ] **步骤 2：添加壁纸设置专用 CSS 文件**

创建 `src/css/wallpaper-settings.css`：

```css
/* ==========================================
   wallpaper-settings.css - 壁纸设置面板样式
   ========================================== */

/* 壁纸预览 */
.wp-settings-preview {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: var(--radius-md);
    height: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    color: white;
}

.wp-settings-preview::after {
    content: '';
    position: absolute;
    inset: 0;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
}

.wp-preview-label {
    font-size: 11px;
    opacity: 0.6;
    position: relative;
    z-index: 1;
}

.wp-preview-source {
    font-size: 10px;
    opacity: 0.4;
    position: relative;
    z-index: 1;
}

/* 预设网格 */
.wp-preset-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 4px 0;
}

.wp-preset-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    transition: transform 0.2s var(--spring-pop);
    font-family: inherit;
}

.wp-preset-item:hover {
    transform: scale(1.05);
}

.wp-preset-item:active {
    transform: scale(0.95);
}

.wp-preset-name {
    font-size: 11px;
    color: var(--text-secondary);
}

/* 模糊滑块 */
.wp-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: var(--bg-tertiary);
    outline: none;
    cursor: pointer;
}

.wp-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    border: 2px solid var(--ios-blue);
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    cursor: pointer;
    transition: transform 0.2s var(--spring-pop);
}

.wp-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
}

.wp-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    border: 2px solid var(--ios-blue);
    cursor: pointer;
}

.wp-slider-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 36px;
    text-align: right;
}

/* 色调选择器 */
.wp-tint-picker {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    padding: 4px 2px;
}

.wp-tint-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    background: none;
    transition: transform 0.2s var(--spring-pop), border-color 0.2s;
}

.wp-tint-btn:hover {
    transform: scale(1.15);
}

.wp-tint-btn.active {
    border-color: var(--ios-blue);
    transform: scale(1.1);
}

.wp-tint-swatch {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 1px solid rgba(128, 128, 128, 0.2);
}

/* 上传按钮 */
.wp-upload-btn {
    width: 100%;
    padding: 12px;
    border: 1px dashed var(--text-tertiary);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s var(--spring-smooth);
}

.wp-upload-btn:hover {
    border-color: var(--ios-blue);
    color: var(--ios-blue);
    background: var(--accent-bg);
}

.wp-upload-btn:active {
    transform: scale(0.97);
}

/* 响应式 */
@media (max-width: 480px) {
    .wp-preset-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
```

- [ ] **步骤 3：在 `index.html` 中添加 CSS 引用**

在 `dialogs.css` 之后（第 16 行）添加：
```html
<link rel="stylesheet" href="./src/css/wallpaper-settings.css">
```

- [ ] **步骤 4：Commit**

```bash
git add index.html src/css/wallpaper-settings.css
git commit -m "feat: update index.html for grouped layout and add wallpaper settings CSS

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### 验证清单

完成所有任务后，在浏览器中验证以下场景：

1. **壁纸系统**：打开页面 → 自动加载 Bing 壁纸 → 壁纸层+模糊+色调正常叠加
2. **暗色模式**：切换暗色 → 壁纸自动暗化（叠加 rgba(0,0,0,0.25)）
3. **壁纸设置**：设置 → 壁纸与背景 → 切换来源/Bing/预设/上传 → 调整模糊滑块 → 选色调
4. **分组布局**：Widget 按组显示，每组有 section 标题（常用工具/任务/快捷方式/资讯）
5. **拖拽排序**：组内拖拽正常，不能跨组拖拽
6. **上下文菜单**：右键 → 切换尺寸/管理/移动到(B)/移除
7. **跨组移动**：右键 → 移动到 → 选目标组 → widget 移动到该组
8. **添加 widget**：底部 + → 选 widget → 自动归入正确组
9. **删除 widget**：右键移除 → 空组消失
10. **旧布局迁移**：清除 localStorage → 打开页面 → 旧布局自动迁移到分组格式
11. **毛玻璃卡片**：widget 卡片半透明，透出壁纸，hover 高亮
12. **响应式**：缩窄浏览器 → 3列→2列→1列 断点正确
