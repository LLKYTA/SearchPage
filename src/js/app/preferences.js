/* ==========================================
   settings.js - 设置弹窗、搜索设置、热榜、词库
   ========================================== */

// ========== 设置弹窗 ==========
function openSettings() {
    window.settingsModal?.open();
}

function closeSettings() {
    window.settingsModal?.close();
}

// ========== 统一初始化设置中的下拉菜单和导航 ==========
let engineDropdown, hotboardDropdown, wordDropdown;
let navPage = null;
let toggleSuggestions, toggleRecents;

function initSettingsDropdowns() {
    // 引擎选择（只显示已启用的引擎）
    const enabled = getEnabledEngines();
    engineDropdown = new UIDropdown({
        el: document.getElementById('settings-engine-dd'),
        items: enabled.map(id => {
            const cfg = getEngineConfig(id);
            return { value: id, label: cfg.name, icon: cfg.icon || 'fa-search' };
        }),
        initialValue: CONFIG.currentEngine,
        onChange: (value) => setSearchEngine(value)
    });

    // 热榜来源
    hotboardDropdown = new UIDropdown({
        el: document.getElementById('settings-hotboard-dd'),
        items: [
            { value: 'weibo',    label: '微博热搜',  icon: 'fa-weibo' },
            { value: 'zhihu',    label: '知乎热榜',  icon: 'fa-question-circle' },
            { value: 'bilibili', label: 'B站热门',   icon: 'fa-play-circle' },
            { value: 'baidu',    label: '百度热搜',  icon: 'fa-paw' },
            { value: 'douyin',   label: '抖音热榜',  icon: 'fa-music' },
            { value: 'toutiao',  label: '今日头条',  icon: 'fa-newspaper-o' },
            { value: '36kr',     label: '36氪',     icon: 'fa-line-chart' },
            { value: 'hupu',     label: '虎扑',     icon: 'fa-trophy' }
        ],
        initialValue: localStorage.getItem('hotboard-source') || 'weibo',
        onChange: (value) => {
            localStorage.setItem('hotboard-source', value);
            const area = WidgetFramework.areas.get('main-area');
            if (area) {
                area.widgets.forEach(w => {
                    if (w instanceof HotboardWidget) w.onUpdate();
                });
            }
        }
    });

    // 单词词库
    wordDropdown = new UIDropdown({
        el: document.getElementById('settings-word-dd'),
        items: [
            { value: 'all',   label: '全部词汇',            icon: 'fa-book' },
            { value: 'cet4',  label: '四级词汇 (CET-4)',    icon: 'fa-graduation-cap' },
            { value: 'cet6',  label: '六级词汇 (CET-6)',    icon: 'fa-graduation-cap' },
            { value: 'ielts', label: '雅思词汇 (IELTS)',     icon: 'fa-language' },
            { value: 'toefl', label: '托福词汇 (TOEFL)',     icon: 'fa-language' },
            { value: 'gre',   label: 'GRE 词汇',            icon: 'fa-flask' }
        ],
        initialValue: localStorage.getItem('dailyword-category') || 'all',
        onChange: (value) => {
            localStorage.setItem('dailyword-category', value);
            const area = WidgetFramework.areas.get('main-area');
            if (area) {
                area.widgets.forEach(w => {
                    if (w instanceof DailyWordWidget) w.onUpdate();
                });
            }
        }
    });
}

/** 当启用的引擎列表变化时，更新设置中的引擎下拉菜单 */
function refreshEngineDropdown() {
    if (!engineDropdown) return;
    const enabled = getEnabledEngines();
    const items = enabled.map(id => {
        const cfg = getEngineConfig(id);
        return { value: id, label: cfg.name, icon: cfg.icon || 'fa-search' };
    });
    engineDropdown.updateItems(items);
    // 如果当前引擎不在列表中，切换到第一个
    if (!enabled.includes(CONFIG.currentEngine) && enabled.length > 0) {
        engineDropdown.setValue(enabled[0], true);
    } else {
        engineDropdown.setValue(CONFIG.currentEngine, true);
    }
}

// ========== 设置导航页面 ==========

function initSettingsNavigation() {
    const body = document.querySelector('#settings-modal .settings-body');
    if (!body) return;
    navPage = new UINavigationPage(body, {
        onPush: (pageId) => {
            if (pageId === 'search') {
                // 初始化搜索设置页面
                initSearchSettingsPage();
            }
        },
        onPop: () => {
            // 返回到根页面时刷新引擎下拉（启停可能已变更）
            refreshEngineDropdown();
        }
    });
    window.navPage = navPage;
}

// ========== 搜索设置 ==========

function openSearchSettings() {
    if (!navPage) initSettingsNavigation();
    if (navPage) navPage.push('search');
}

function initSearchSettingsPage() {
    // 只初始化一次
    if (toggleSuggestions) return;

    // 搜索建议开关
    const suggestEl = document.getElementById('toggle-suggestions');
    if (suggestEl) {
        toggleSuggestions = new UIToggle({
            el: suggestEl,
            initialValue: localStorage.getItem('search-suggestions-enabled') !== 'false',
            onChange: (val) => {
                localStorage.setItem('search-suggestions-enabled', val);
            }
        });
        window.__toggleSuggestions = toggleSuggestions;
    }

    // 最近搜索开关
    const recentsEl = document.getElementById('toggle-recents');
    if (recentsEl) {
        toggleRecents = new UIToggle({
            el: recentsEl,
            initialValue: localStorage.getItem('recent-searches-enabled') !== 'false',
            onChange: (val) => {
                localStorage.setItem('recent-searches-enabled', val);
            }
        });
        window.__toggleRecents = toggleRecents;
    }
}

function closeWidgetGallery() {
    window.galleryModal?.close();
}

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
