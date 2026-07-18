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
