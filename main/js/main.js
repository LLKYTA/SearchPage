/* ==========================================
   main.js - KD起始页全局逻辑（含启动动画）
   ========================================== */
let currentManageWidget = null;

const CONFIG = {
  searchEngines: {
    baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
    google: { name: 'Google', url: 'https://www.google.com/search?q=' },
    bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' }
  },
  currentEngine: 'bing',
  currentTheme: 'auto'
};

// 注册所有小组件
WidgetFramework.register('clock', ClockWidget);
WidgetFramework.register('weather', WeatherWidget);
WidgetFramework.register('shortcuts', ShortcutsWidget);
WidgetFramework.register('todo', TodoWidget);
WidgetFramework.register('bookmarks', BookmarksWidget);
WidgetFramework.register('ai-tools', AiToolsWidget);
WidgetFramework.register('hotboard', HotboardWidget);
WidgetFramework.register('time-progress', TimeProgressWidget); // 时间进度条

document.addEventListener('DOMContentLoaded', () => {
  WidgetFramework.init();
  initSearch();
  loadSettings();
  applyTheme();

  const hotboardSelect = document.getElementById('hotboard-source-select');
  if (hotboardSelect) {
    const savedSource = localStorage.getItem('hotboard-source') || 'weibo';
    hotboardSelect.value = savedSource;
  }

  // --- iOS 风格启动动画 ---
  const splash = document.getElementById('splash-screen');
  if (splash) {
    setTimeout(() => {
      splash.classList.add('hide');
      splash.addEventListener('transitionend', () => {
        splash.remove();
      }, { once: true });
    }, 1900);
  }
});

// ========== 搜索 ==========
function initSearch() {
  document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });
  document.getElementById('search-btn').addEventListener('click', performSearch);
}

function performSearch() {
  const query = document.getElementById('search-input').value.trim();
  if (query) {
    window.open(CONFIG.searchEngines[CONFIG.currentEngine].url + encodeURIComponent(query), '_blank');
  }
}

function setSearchEngine(engine) {
  CONFIG.currentEngine = engine;
  document.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-engine="${engine}"]`).classList.add('active');
  document.getElementById('current-engine').textContent = CONFIG.searchEngines[engine].name;
  document.getElementById('default-engine').value = engine;
  saveSettings();
}

function saveDefaultEngine() {
  const select = document.getElementById('default-engine');
  if (select) setSearchEngine(select.value);
}

// ========== 主题 ==========
function toggleDarkMode() {
  document.documentElement.classList.contains('dark') ? setTheme('light') : setTheme('dark');
}

function setTheme(theme) {
  CONFIG.currentTheme = theme;
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
  applyTheme();
  saveSettings();
}

function applyTheme() {
  const isDark = CONFIG.currentTheme === 'auto' ?
    window.matchMedia('(prefers-color-scheme: dark)').matches :
    CONFIG.currentTheme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = isDark ? 'fa fa-sun-o' : 'fa fa-moon-o';
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (CONFIG.currentTheme === 'auto') applyTheme();
});

// ========== 设置持久化 ==========
function saveSettings() {
  localStorage.setItem('kd-startpage-settings', JSON.stringify({
    currentEngine: CONFIG.currentEngine,
    currentTheme: CONFIG.currentTheme
  }));
}

function loadSettings() {
  const saved = JSON.parse(localStorage.getItem('kd-startpage-settings') || '{}');
  CONFIG.currentEngine = saved.currentEngine || 'bing';
  CONFIG.currentTheme = saved.currentTheme || 'auto';
  document.getElementById('default-engine').value = CONFIG.currentEngine;
  setSearchEngine(CONFIG.currentEngine);
}

// ========== 热榜来源 ==========
function saveHotboardSource() {
  const select = document.getElementById('hotboard-source-select');
  if (select) {
    localStorage.setItem('hotboard-source', select.value);
    const area = WidgetFramework.areas.get('main-area');
    if (area) {
      area.widgets.forEach(w => {
        if (w instanceof HotboardWidget) w.onUpdate();
      });
    }
  }
}

// ========== 背景（占位） ==========
function setBackground(type, el) {
  document.querySelectorAll('.bg-option').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  localStorage.setItem('background', type);
}

// ========== 管理弹窗桥接 ==========
function openWidgetManager(type) {
  const area = WidgetFramework.areas.get('main-area');
  if (area) {
    const widget = area.widgets.find(w => w.constructor.type === type);
    if (widget && typeof widget.openManager === 'function') {
      closeSettings();
      widget.openManager();
      return;
    }
  }
  alert('未找到该小组件，请先在桌面添加。');
}

function closeManageModal() {
  document.getElementById('manage-modal').classList.remove('active');
  document.body.style.overflow = '';
  if (currentManageWidget) {
    currentManageWidget.render();
    currentManageWidget = null;
  }
}

function manageAddItem() {
  if (!currentManageWidget) return;
  if (currentManageWidget instanceof TodoWidget) {
    const todos = JSON.parse(localStorage.getItem('todos') || '[]');
    todos.push({ text: '新待办', completed: false });
    localStorage.setItem('todos', JSON.stringify(todos));
  } else if (currentManageWidget instanceof BookmarksWidget) {
    const bookmarks = JSON.parse(localStorage.getItem('custom-bookmarks') || '[]');
    bookmarks.push({ name: '新书签', url: 'https://', favicon: '' });
    localStorage.setItem('custom-bookmarks', JSON.stringify(bookmarks));
  } else if (currentManageWidget instanceof AiToolsWidget) {
    const tools = JSON.parse(localStorage.getItem('custom-ai-tools') || '[]');
    tools.push({ name: '新工具', url: 'https://', favicon: '' });
    localStorage.setItem('custom-ai-tools', JSON.stringify(tools));
  } else if (currentManageWidget instanceof ShortcutsWidget) {
    const shortcuts = JSON.parse(localStorage.getItem('custom-shortcuts') || '[]');
    shortcuts.push({ name: '新快捷', url: 'https://', icon: 'fa-external-link', color: '#999' });
    localStorage.setItem('custom-shortcuts', JSON.stringify(shortcuts));
  }
  currentManageWidget.openManager();
}

// ========== 设置弹窗 ==========
function openSettings() {
  document.getElementById('settings-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  document.getElementById('settings-modal').classList.remove('active');
  document.body.style.overflow = '';
}

// ========== 关于弹窗 ==========
function openAboutModal() {
  closeSettings();
  document.getElementById('about-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAboutModal() {
  document.getElementById('about-modal').classList.remove('active');
  document.body.style.overflow = '';
}

// 绑定遮罩关闭
document.addEventListener('click', function(e) {
  if (e.target.id === 'about-modal') closeAboutModal();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeAboutModal();
    closeManageModal();
    closeSettings();
    document.getElementById('widget-gallery-modal')?.classList.remove('active');
  }
});

// ========== 工具函数 ==========
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}