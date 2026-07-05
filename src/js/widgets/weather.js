/* ==========================================
   weather.js - 天气显示小组件（UAPI）
   ========================================== */

// 天气 emoji 映射
function getWeatherEmoji(code) {
    const map = {
        100: 0x2600, 101: 0x26C5, 102: 0x1F324, 103: 0x26C5, 104: 0x2601,
        150: 0x1F319, 151: 0x1F319, 152: 0x1F319, 153: 0x1F319,
        300: 0x1F326, 301: 0x1F327, 302: 0x26C8, 303: 0x26C8, 304: 0x26C8,
        305: 0x1F327, 306: 0x1F327, 307: 0x1F327, 308: 0x1F327, 309: 0x1F327,
        310: 0x1F30A, 311: 0x1F30A, 312: 0x1F30A, 313: 0x1F974,
        314: 0x1F327, 315: 0x1F327, 316: 0x1F30A, 317: 0x1F30A, 318: 0x1F30A,
        350: 0x1F319, 351: 0x1F319, 399: 0x1F327,
        400: 0x1F328, 401: 0x1F328, 402: 0x2744, 403: 0x2744, 404: 0x1F328,
        405: 0x1F328, 406: 0x1F328, 407: 0x1F328, 408: 0x1F328, 409: 0x2744,
        410: 0x2744, 456: 0x1F319, 457: 0x1F319, 499: 0x2744,
        500: 0x1F32B, 501: 0x1F32B, 502: [0x1F636, 0x200D, 0x1F32B],
        503: 0x1F4A8, 504: 0x1F4A8, 507: 0x1F3DC, 508: 0x1F3DC, 509: 0x1F32B,
        510: 0x1F32B, 511: [0x1F636, 0x200D, 0x1F32B], 512: [0x1F636, 0x200D, 0x1F32B],
        513: [0x1F636, 0x200D, 0x1F32B], 514: 0x1F32B, 515: 0x1F32B,
        800: 0x1F311, 801: 0x1F312, 802: 0x1F313, 803: 0x1F314, 804: 0x1F315,
        805: 0x1F316, 806: 0x1F317, 807: 0x1F318,
        900: 0x1F975, 901: 0x1F976, 999: 0x2753, 9999: 0x26A0
    };
    const emoji = map[code];
    if (!emoji) return 0x2753;
    if (Array.isArray(emoji)) return emoji.reduce((s, c) => s + String.fromCodePoint(c), '');
    return emoji;
}

class WeatherWidget extends Widget {
    static type = 'weather';
    static displayName = '天气';
    static defaultSize = 'sm';
    static icon = 'fa-cloud';

    constructor(container, index) {
        super(container, index);
        this.weatherData = null;
    }

    render() {
        if (this.weatherData) {
            this._renderBySize(this.currentSize);
        } else {
            const content = this.element.querySelector('.widget-content');
            content.innerHTML = `<div class="weather-content">
                <i class="weather-icon" style="font-style:normal">--</i>
                <div>
                    <div class="weather-temp">加载中</div>
                    <div class="weather-desc">--</div>
                </div>
            </div>`;
            this.fetchWeather();
        }
    }

    onResize(newSize) {
        if (this.weatherData) this._renderBySize(newSize);
    }

    async fetchWeather() {
        if (typeof GetWeather !== 'function') return;
        const data = await GetWeather();
        if (!data || !this.element) return;
        this.weatherData = data;
        this._renderBySize(this.currentSize);
    }

    _renderBySize(size) {
        const data = this.weatherData;
        const content = this.element.querySelector('.widget-content');
        if (!content) return;
        const emoji = String.fromCodePoint(getWeatherEmoji(data.weather_icon));
        const temp = data.temperature;
        const desc = data.weather;
        const city = data.city || '';
        const feel = data.feels_like;
        const humidity = data.humidity;
        const wind = `${data.wind_direction || ''} ${data.wind_power || ''}`.trim();
        const aqi = data.aqi;
        const aqiLevel = data.aqi_category || '';
        const uv = data.uv;

        if (size === 'sm') {
            content.innerHTML = `<div class="weather-content">
                <i class="weather-icon" style="font-style:normal">${emoji}</i>
                <div>
                    <div class="weather-temp">${temp}℃</div>
                    <div class="weather-desc">${desc}</div>
                </div>
            </div>`;
        } else if (size === 'md') {
            content.innerHTML = `<div class="weather-content">
                <i class="weather-icon" style="font-style:normal; font-size:40px">${emoji}</i>
                <div>
                    <div class="weather-temp" style="font-size:32px">${temp}℃</div>
                    <div class="weather-desc">${desc} · ${city}</div>
                    <div style="font-size:12px; margin-top:4px;">体感 ${feel}℃</div>
                    ${aqi ? `<div style="font-size:12px;">AQI ${aqi} ${aqiLevel}</div>` : ''}
                </div>
            </div>`;
        } else {
            content.innerHTML = `<div style="text-align:center;">
                <i class="weather-icon" style="font-size:48px; display:block;">${emoji}</i>
                <div class="weather-temp" style="font-size:48px;">${temp}℃</div>
                <div class="weather-desc" style="font-size:16px;">${desc}</div>
                <div style="font-size:13px; margin-top:8px;">
                    <span>📍 ${city}</span>
                    ${feel ? `<span style="margin-left:12px;">🌡️ 体感 ${feel}℃</span>` : ''}
                </div>
                <div style="font-size:12px; margin-top:6px;">
                    ${wind ? `<span>🌬 ${wind}</span>` : ''}
                    ${humidity ? `<span style="margin-left:12px;">💧 ${humidity}%</span>` : ''}
                    ${uv ? `<span style="margin-left:12px;">☀️ UV ${uv}</span>` : ''}
                </div>
                ${aqi ? `<div style="font-size:12px; margin-top:6px;">空气质量：${aqi} ${aqiLevel}</div>` : ''}
            </div>`;
        }
    }

    onUpdate() { this.fetchWeather(); }
}
