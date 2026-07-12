# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KD起始页 — an iOS-style browser start page with a widget system, drag-and-drop sorting, multi-engine search, dark mode, and real-time news aggregator. Pure static HTML/CSS/JS, no build step, no framework dependencies.

## Quick Start

```bash
# Serve locally and open in browser
python3 -m http.server 8080
# or: npx serve .
```

The project is a single-page app — just open `index.html` in a browser. No npm install, no build.

## Architecture

### Three-Layer Widget Framework

```
WidgetFramework (global registry, layout persistence, widget gallery)
    └─ WidgetArea (area container, manages widget list, sortable)
        └─ Widget (base class, defines lifecycle, DOM skeleton, size switching)
            └─ Concrete widgets (ClockWidget, WeatherWidget, …)
```

### Key Files

| Layer | Files | Purpose |
|-------|-------|---------|
| **Infrastructure** | `src/js/lib/widget-framework.js` | Framework core: `WidgetFramework` singleton, `Widget` base class, `WidgetArea` |
| **Infrastructure** | `src/js/lib/uapi.js` | External APIs: weather, hotboard, daily word (via uapis.cn) |
| **Widgets** | `src/js/widgets/*.js` | 8 standalone widget classes, one file each, no cross-dependencies |
| **App logic** | `src/js/app/app.js` | Entry point: init, search, theme toggle, widget registration |
| **App logic** | `src/js/app/preferences.js` | Settings dialog: background, hotboard source, word category |
| **App logic** | `src/js/app/admin.js` | Management modals (CRUD for bookmarks/todos/etc), about dialog, global shortcuts |
| **Styles** | `src/css/variables.css` | Design tokens: colors, radius, shadows, transitions, dark mode vars |
| **Styles** | `src/css/layout.css` | Page skeleton: header, search bar, background gradient & bubbles, responsive |
| **Styles** | `src/css/widgets.css` | All widget card styles + drag-and-drop states + grid layout |
| **Styles** | `src/css/dialogs.css` | Modal, settings panel, bottom sheet, splash animation |

### Data Flow

- **Layout persistence**: `localStorage['widgets-layout']` stores widget order, size, and config per area
- **Widget data**: Each widget manages its own `localStorage` key (e.g. `todos`, `custom-bookmarks`, `custom-shortcuts`)
- **External data**: Weather, hotboard, daily word fetched via UAPI (`https://uapis.cn`)
- **Fallback layout**: Defined in `index.html` via `data-default-widgets` JSON attribute

### Theme System

- CSS custom properties on `:root` (light) and `.dark` (dark override)
- Three modes: light / dark / auto (follows `prefers-color-scheme`)
- Toggled by `app.js` → `setTheme()` / `toggleDarkMode()`

### Search

- Three engines: Baidu, Google, Bing — switched via header tabs
- `CONFIG.searchEngines` in `app.js` maps engine key to search URL
- Settings persistence stores the current engine

## How to Develop a New Widget

1. Create `src/js/widgets/<name>.js`:

```javascript
class MyWidget extends Widget {
    static type = 'my-widget';
    static displayName = 'My Widget';
    static defaultSize = 'sm';   // 'sm' | 'md' | 'lg'
    static icon = 'fa-smile-o';  // FontAwesome 4 class
    static maxPerArea = 1;       // optional, default Infinity

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = `<p>Hello!</p>`;
    }
    // optional: onUpdate(), openManager(), onResize(size), destroy()
}
```

2. Register in `src/js/app/app.js`:
```javascript
WidgetFramework.register('my-widget', MyWidget);
```

3. Add style in `src/css/widgets.css` using `.my-widget-` prefix.

4. Add `<script>` tag in `index.html` (in the widgets section, before `app.js`).

## Conventions

- **CSS**: All widget styles go in `widgets.css`. Use `var(--ios-blue)`, `var(--text-primary)`, etc. from `variables.css`.
- **Glass effect**: Apply class `glass` for backdrop-filter blur. Dialogs use `modal-content glass`.
- **Widget header**: The base class creates `.widget-header` with icon + title + action buttons. Override `createDOM()` only if you need a completely different header.
- **Size responsiveness**: Use `this.currentSize` in `render()` to conditionally display content. `onResize(newSize)` is called after size switch.
- **Error states**: Widgets must handle null/error API responses gracefully (e.g., retry button in `daily-word.js`).
- **Data storage**: Use `localStorage` directly — no data layer abstraction. Each widget owns its keys.
- **Icons**: Font Awesome 4 (`<i class="fa fa-xxx">` loaded from CDN).

## Dependencies (loaded via CDN in index.html)

- Font Awesome 4.7.0 (icons)
- SortableJS 1.15.0 (drag-and-drop)
- UAPI SDK (weather, hotboard data)

## External APIs

All external data flows through `lib/uapi.js`:
- `GetWeather()` → returns weather data object
- `GetHotboard(type)` → returns hot list by source (weibo/zhihu/bilibili/baidu/douyin/toutiao/36kr/hupu)
- `GetDailyWord(category, count)` → returns word data
- `GetWebsiteMetadata(url)` → returns website metadata with favicon
- Failure cache (`FAILURE_CACHE`) prevents repeated requests to failed URLs (5-min TTL)
